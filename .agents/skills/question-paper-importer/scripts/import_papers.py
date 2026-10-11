#!/usr/bin/env python3
"""
Importer script to generate segregated markdown files for Science board question papers
following the practice-js quiz protocol.
"""
import os
import re
import shutil
import sys

# Import year datasets
from data_2023 import QUESTIONS_2023
from data_2024 import QUESTIONS_2024
from data_2025 import QUESTIONS_2025
from data_2026 import QUESTIONS_2026

DATASETS = {
    "2023": QUESTIONS_2023,
    "2024": QUESTIONS_2024,
    "2025": QUESTIONS_2025,
    "2026": QUESTIONS_2026,
}


def safe_yaml_str(s: str) -> str:
    """Formats a string as a safe single-quoted YAML scalar."""
    escaped = str(s).replace("'", "''")
    return f"'{escaped}'"


def serialize_yaml(fm: dict) -> str:
    """Serializes frontmatter dict into clean, indented, quote-safe YAML."""
    lines = []
    if "complexity" in fm:
        lines.append(f"complexity: {safe_yaml_str(fm['complexity'])}")
    if "tags" in fm and fm["tags"]:
        lines.append("tags:")
        for t in fm["tags"]:
            lines.append(f"  - {t}")
    if "choices" in fm and fm["choices"]:
        lines.append("choices:")
        for c in fm["choices"]:
            lines.append(f"  - {safe_yaml_str(c)}")
    if "answers" in fm and fm["answers"]:
        lines.append("answers:")
        for a in fm["answers"]:
            lines.append(f"  - {safe_yaml_str(a)}")
    if "matches" in fm and fm["matches"]:
        lines.append("matches:")
        for m in fm["matches"]:
            lines.append(f"  - {safe_yaml_str(m)}")
    return "\n".join(lines)



def format_question_body(text: str, lang: str = "en") -> str:
    """Formats question text into proper Markdown headers and lists."""
    cleaned = text.strip()
    lines = [l.strip() for l in cleaned.split("\n") if l.strip()]

    if len(lines) == 1:
        return f"## {lines[0]}"

    first = lines[0]
    rest = lines[1:]

    # Match the following or Differentiate question header
    if any(first.startswith(p) for p in ["Match the following", "பொருத்துக", "Differentiate", "வேறுபடுத்துக"]):
        return f"## {first}\n\n" + "\n".join(rest)
    elif "**OR**" in cleaned or "**அல்லது**" in cleaned:
        header = (
            "## Answer the following question (Internal Choice):"
            if lang == "en"
            else "## பின்வரும் வினாக்களுக்கு விடையளிக்கவும் (அல்லது வினா):"
        )
        return f"{header}\n\n{cleaned}"
    elif first.startswith(("(a)", "(i)", "(அ)", "1.")):
        header = (
            "## Answer the following questions:"
            if lang == "en"
            else "## பின்வரும் வினாக்களுக்கு விடையளிக்கவும்:"
        )
        return f"{header}\n\n" + "\n\n".join(lines)
    else:
        return f"## {first}\n\n" + "\n\n".join(rest)


def format_markdown(frontmatter: dict, question_text: str, explanation_text: str, lang: str = "en") -> str:
    """Formats frontmatter, question body, and explanation into compliant markdown."""
    fm_str = serialize_yaml(frontmatter).strip()
    q_body = format_question_body(question_text, lang)
    # Replace any internal '---' in explanation with '***' to avoid splitting conflicts
    exp_clean = re.sub(r"\n\s*---\s*\n", "\n\n***\n\n", explanation_text.strip())

    return f"---\n{fm_str}\n---\n\n{q_body}\n\n---\n\n{exp_clean}\n"


def build_questions_md(datasets: dict, target_file: str = "QUESTIONS.md"):
    """Generates QUESTIONS.md containing all 2-mark, 4-mark, and 7-mark questions."""
    tiers = [
        ("2-marks", "2 Marks Questions (Short Answer / குறு வினாக்கள் - Part II)"),
        ("4-marks", "4 Marks Questions (Brief Answer / சிறு வினாக்கள் - Part III)"),
        ("7-marks", "7 Marks Questions (Detailed Answer / பெரு வினாக்கள் - Part IV)"),
    ]

    lines = [
        "# Science Board Examination Questions (2 Marks, 4 Marks & 7 Marks)",
        "",
        "Comprehensive bilingual question bank compiled from Tamil Nadu SSLC Science Board Examinations (2023–2026), covering all 2-mark, 4-mark, and 7-mark descriptive and numerical questions along with detailed model answers.",
        "",
        "## Table of Contents",
        "",
    ]

    for y in datasets.keys():
        lines.append(f"- [{y} Science Examination](#year-{y})")
        for t_dir, _ in tiers:
            anchor = f"{y}-{t_dir}"
            short_name = t_dir.replace("-", " ").title()
            lines.append(f"  - [{y} {short_name}](#{anchor})")
    lines.extend(["", "---", ""])

    total_q = 0
    for y, questions in datasets.items():
        lines.extend([f'<a id="year-{y}"></a>', f"# Year {y}", ""])
        for t_dir, t_title in tiers:
            tier_questions = [q for q in questions if q.get("marks") == t_dir]
            if not tier_questions:
                continue
            lines.extend([f'<a id="{y}-{t_dir}"></a>', f"## {y} - {t_title}", ""])

            for q in tier_questions:
                total_q += 1
                q_id = q["id"]
                lines.extend([
                    f"### Question {q_id.upper()} ({y} • {t_dir})",
                    "",
                    f"**Exam Year**: {y} | **Marks Tier**: {t_dir} | **ID**: {q_id}",
                    "",
                    "#### 🇬🇧 English",
                    "",
                    format_question_body(q["question_en"], "en"),
                    "",
                    "<details>",
                    "<summary><b>View Model Answer & Solution (English)</b></summary>",
                    "",
                    q["explanation_en"].strip(),
                    "",
                    "</details>",
                    "",
                    "#### 🇮🇳 தமிழ் (Tamil)",
                    "",
                    format_question_body(q["question_ta"], "ta"),
                    "",
                    "<details>",
                    "<summary><b>மாதிரி விடை மற்றும் தீர்வு (தமிழ்)</b></summary>",
                    "",
                    q["explanation_ta"].strip(),
                    "",
                    "</details>",
                    "",
                    "---",
                    "",
                ])
        lines.append("")

    with open(target_file, "w", encoding="utf-8") as out:
        out.write("\n".join(lines))
    print(f"📖 Written {total_q} questions (2-marks, 4-marks, 7-marks) to {target_file}")


def generate_questions(datasets: dict, base_dir: str = "questions"):
    """Generates 1-mark questions in questions/science/ and writes 2+ mark questions to QUESTIONS.md."""
    print(f"🚀 Starting Question Paper Import into: {base_dir}")
    science_dir = os.path.join(base_dir, "science")
    os.makedirs(science_dir, exist_ok=True)

    # Clean out any stray subdirectories inside questions/science to keep only 1-mark files
    for item in os.listdir(science_dir):
        item_path = os.path.join(science_dir, item)
        if os.path.isdir(item_path):
            shutil.rmtree(item_path)

    counter_1m = 1
    total_1m_files = 0

    for year, questions in datasets.items():
        print(f"\n📂 Processing Year: {year} (1-mark questions)")
        for q in questions:
            if q.get("marks") == "1-mark":
                q_base = f"q{counter_1m:02d}"
                counter_1m += 1

                # Frontmatter
                fm_en = {
                    "complexity": q.get("complexity", "M"),
                    "tags": q.get("tags", ["science", "1-mark"]),
                    "choices": q["choices_en"],
                    "answers": q["answers_en"],
                }
                fm_ta = {
                    "complexity": q.get("complexity", "M"),
                    "tags": q.get("tags", ["science", "1-mark"]),
                    "choices": q["choices_ta"],
                    "answers": q["answers_ta"],
                }

                content_en = format_markdown(fm_en, q["question_en"], q["explanation_en"], lang="en")
                content_ta = format_markdown(fm_ta, q["question_ta"], q["explanation_ta"], lang="ta")

                file_en = os.path.join(science_dir, f"{q_base}.md")
                file_ta = os.path.join(science_dir, f"{q_base}_ta.md")

                with open(file_en, "w", encoding="utf-8") as f:
                    f.write(content_en)
                with open(file_ta, "w", encoding="utf-8") as f:
                    f.write(content_ta)
                total_1m_files += 2

    print(f"\n✅ Generated {total_1m_files} 1-mark files in {science_dir}/")

    # Generate QUESTIONS.md with all 2-marks, 4-marks, and 7-marks
    build_questions_md(datasets, "QUESTIONS.md")


def main():
    base_dir = os.environ.get("QUESTIONS_FOLDER", "questions")
    generate_questions(DATASETS, base_dir)
    print("\n🎉 Import complete! Run 'npm run build:questions' to compile.")


if __name__ == "__main__":
    main()


