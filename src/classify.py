"""Stage 2: Classify — score pain candidates with Claude."""

import asyncio
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import anthropic
from rich import box
from rich.console import Console
from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

sys.path.insert(0, str(Path(__file__).parent))
from config import ANTHROPIC_API_KEY, CLASSIFICATION_MODEL, DATA_DIR, MIN_PAIN_SCORE

console = Console()

CLASSIFY_PROMPT = (Path(__file__).parent.parent / "prompts" / "classify.md").read_text()

# Prioritization parameters
PRIORITY_MIN_BODY = 50
PRIORITY_MAX_DAYS = 30
MAX_PER_REPO = 10
TOP_N = 100

# Bot comment fingerprints to exclude
_BOT_PATTERNS = [
    r"coderabbit\.ai",
    r"auto-generated comment",
    r"readthedocs\.org",
    r"github-actions\[bot\]",
    r"codecov\[bot\]",
    r"dependabot\[bot\]",
    r"app\.readthedocs\.org",
]

# Keywords that strongly suggest AI coding pain — boosted in ranking
_PAIN_KEYWORDS = [
    r"AI.{0,30}(slop|junk|vomit|garbage)",
    r"vibe.?cod",
    r"(generated|authored|written).{0,30}(claude|copilot|cursor|chatgpt|gemini)",
    r"(claude|copilot|cursor|chatgpt|gemini).{0,30}(generated|wrote|authored|produced)",
    r"AI.{0,30}generated.{0,60}(PR|pull request|patch|diff|code)",
    r"(reject|decline|not accept).{0,50}AI.{0,30}(generated|code)",
    r"AI.{0,20}(generated|code).{0,50}(reject|decline|not accept|ban|prohibit)",
    r"does not accept.{0,30}AI",
    r"too large to review",
    r"review.{0,30}burden",
    r"(flooded|overwhelmed|drowning).{0,30}(AI|PR)",
    r"(AI|LLM).{0,30}(PR|contribution).{0,30}(problem|issue|concern|worried)",
    r"lost.{0,20}context",
    r"no.{0,20}context.{0,30}(AI|generat)",
    r"what.{0,20}(is this PR|does this change|trying to do)",
    r"(unclear|confus).{0,50}(AI|generat|LLM)",
    r"AI.{0,20}attribution",
    r"disclose.{0,30}AI",
    r"(fully|predominantly).{0,30}AI.{0,30}generated",
]

# Concurrency
MAX_CONCURRENT = 5

# Split prompt at "## Input" so we can cache the stable criteria as system message
_PROMPT_PARTS = CLASSIFY_PROMPT.split("## Input", 1)
SYSTEM_CRITERIA = _PROMPT_PARTS[0].strip()
OUTPUT_SCHEMA = "## Output" + _PROMPT_PARTS[1].split("## Output", 1)[1] if "## Output" in _PROMPT_PARTS[1] else ""


def load_latest_candidates() -> list:
    raw_dir = DATA_DIR / "raw"
    runs = sorted(raw_dir.iterdir(), reverse=True)
    if not runs:
        console.print("[red]No raw data found. Run acquire.py first.[/red]")
        sys.exit(1)
    path = runs[0] / "candidates.json"
    console.print(f"Loading candidates from [cyan]{path}[/cyan]")
    return json.loads(path.read_text())


def _is_bot(body: str, author: str) -> bool:
    text = body + " " + author
    return any(re.search(p, text, re.I) for p in _BOT_PATTERNS)


def _pain_score(candidate: dict) -> int:
    """Heuristic pre-score: higher = more likely to be a real AI pain signal."""
    text = candidate["body"] + " " + candidate["title"]
    hits = sum(1 for p in _PAIN_KEYWORDS if re.search(p, text, re.I))
    score = hits * 10
    if candidate["source_type"] == "search_result":
        score += 5  # search results explicitly matched our pain queries
    if candidate.get("maintainer_signal"):
        score += 3
    return score


def prioritize(candidates: list) -> list:
    import re as _re
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=PRIORITY_MAX_DAYS)

    filtered = []
    for c in candidates:
        if len(c["body"]) < PRIORITY_MIN_BODY:
            continue
        if _is_bot(c["body"], c.get("author", "")):
            continue
        try:
            created = datetime.fromisoformat(c["created_at"])
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if created < cutoff:
                continue
        except (ValueError, KeyError):
            continue
        filtered.append(c)

    # Sort by pain signal score (desc), then body length as tiebreaker
    filtered.sort(key=lambda x: (_pain_score(x), len(x["body"])), reverse=True)

    # Cap per repo for diversity
    repo_counts: dict = {}
    diversified = []
    for c in filtered:
        repo = c.get("repo", "unknown")
        if repo_counts.get(repo, 0) >= MAX_PER_REPO:
            continue
        repo_counts[repo] = repo_counts.get(repo, 0) + 1
        diversified.append(c)

    selected = diversified[:TOP_N]

    high_signal = sum(1 for c in selected if _pain_score(c) > 0)
    console.print(
        f"Prioritized: [bold]{len(filtered)}[/bold] passed filters → "
        f"[bold]{len(diversified)}[/bold] after repo cap → "
        f"[bold green]{len(selected)}[/bold green] selected "
        f"([yellow]{high_signal} with keyword signal[/yellow])"
    )
    return selected


def _build_user_message(candidate: dict) -> str:
    pr_size = str(candidate["pr_size"]) if candidate.get("pr_size") is not None else "unknown"
    body = candidate["body"][:4000]
    context = (candidate.get("context_snippet") or "")[:500] or "(none)"

    return (
        f"## Input\n\n"
        f"Source type: {candidate['source_type']}\n"
        f"Repository: {candidate['repo']}\n"
        f"URL: {candidate['url']}\n"
        f"Title: {candidate['title']}\n"
        f"Author: {candidate['author']}\n"
        f"Is maintainer: {candidate['maintainer_signal']}\n"
        f"Created: {candidate['created_at']}\n"
        f"PR size (lines changed): {pr_size}\n\n"
        f"Body:\n---\n{body}\n---\n\n"
        f"Context snippet:\n---\n{context}\n---\n\n"
        f"{OUTPUT_SCHEMA}"
    )


def _parse_response(text: str) -> Optional[dict]:
    text = text.strip()
    # Strip markdown code fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        data = json.loads(text)
        required = {"pain_score", "pain_type", "rationale"}
        if not required.issubset(data.keys()):
            return None
        return data
    except json.JSONDecodeError:
        return None


async def _classify_one(
    client: anthropic.AsyncAnthropic,
    candidate: dict,
    sem: asyncio.Semaphore,
) -> dict:
    async with sem:
        try:
            response = await client.messages.create(
                model=CLASSIFICATION_MODEL,
                max_tokens=512,
                system=[
                    {
                        "type": "text",
                        "text": SYSTEM_CRITERIA,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=[{"role": "user", "content": _build_user_message(candidate)}],
            )
            raw = response.content[0].text if response.content else ""
            parsed = _parse_response(raw)
            if parsed:
                return {**candidate, **parsed}
            else:
                console.print(
                    f"  [yellow]Malformed JSON for {candidate['id']} — skipping[/yellow]"
                )
                return {
                    **candidate,
                    "pain_score": 0,
                    "pain_type": "not_a_pain_moment",
                    "rationale": "Parse error",
                    "entire_relevance": "",
                    "maintainer_audience_size": "small",
                }
        except anthropic.APIError as e:
            console.print(f"  [red]API error for {candidate['id']}: {e}[/red]")
            return {
                **candidate,
                "pain_score": 0,
                "pain_type": "not_a_pain_moment",
                "rationale": f"API error: {e}",
                "entire_relevance": "",
                "maintainer_audience_size": "small",
            }


async def classify_all(candidates: list) -> list:
    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    sem = asyncio.Semaphore(MAX_CONCURRENT)
    results = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        TextColumn("({task.completed}/{task.total})"),
        TimeElapsedColumn(),
        console=console,
        transient=False,
    ) as progress:
        task_id = progress.add_task("Classifying candidates...", total=len(candidates))

        async def _wrap(c: dict) -> dict:
            result = await _classify_one(client, c, sem)
            progress.advance(task_id)
            return result

        results = await asyncio.gather(*[_wrap(c) for c in candidates])

    return list(results)


def run() -> None:
    if not ANTHROPIC_API_KEY:
        console.print("[bold red]ANTHROPIC_API_KEY not set. Add it to .env and retry.[/bold red]")
        sys.exit(1)

    candidates = load_latest_candidates()
    console.print(f"Total candidates loaded: [bold]{len(candidates)}[/bold]")

    console.rule("[bold cyan]Stage 2: Classify — prioritizing candidates[/bold cyan]")
    selected = prioritize(candidates)

    if not selected:
        console.print("[yellow]No candidates passed the priority filter.[/yellow]")
        return

    console.rule("[bold cyan]Classifying with Claude[/bold cyan]")
    scored = asyncio.run(classify_all(selected))

    # Save full scored set
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = DATA_DIR / "classified" / timestamp
    out_dir.mkdir(parents=True, exist_ok=True)

    scored_file = out_dir / "scored.json"
    scored_file.write_text(json.dumps(scored, indent=2))
    console.print(f"\nSaved {len(scored)} scored candidates → [cyan]{scored_file}[/cyan]")

    # Filter qualified
    qualified = [
        c for c in scored
        if c.get("pain_score", 0) >= MIN_PAIN_SCORE
        and c.get("pain_type") != "not_a_pain_moment"
    ]
    qualified.sort(key=lambda x: x.get("pain_score", 0), reverse=True)

    qualified_file = out_dir / "qualified.json"
    qualified_file.write_text(json.dumps(qualified, indent=2))
    console.print(f"Saved {len(qualified)} qualified candidates → [cyan]{qualified_file}[/cyan]")

    # Summary table — top 10
    console.rule("[bold green]Top 10 Pain Moments[/bold green]")
    table = Table(box=box.ROUNDED, show_lines=True)
    table.add_column("#", style="dim", width=3)
    table.add_column("Score", justify="center", style="bold red", width=6)
    table.add_column("Repo", style="cyan", width=22)
    table.add_column("Pain Type", style="yellow", width=22)
    table.add_column("Rationale", width=55)

    for i, c in enumerate(qualified[:10], 1):
        table.add_row(
            str(i),
            str(c.get("pain_score", "?")),
            c.get("repo", ""),
            c.get("pain_type", ""),
            (c.get("rationale") or "")[:200],
        )

    console.print(table)
    console.print(
        f"\n[bold]Summary:[/bold] {len(scored)} classified → "
        f"[green]{len(qualified)} qualified[/green] (score ≥ {MIN_PAIN_SCORE})"
    )
    console.print(f"Output directory: {out_dir}")


if __name__ == "__main__":
    run()
