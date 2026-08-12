#!/usr/bin/env python3
"""Bounded live-browser evidence for the T3 Mineral Shelf candidate.

Run through the repository's Vite server with the webapp-testing with_server helper,
passing this script with --base-url and --stage final.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from playwright.sync_api import Browser, Page, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_ROOT = ROOT / "docs" / "qa" / "evidence" / "tetris-t3"
PROGRESS_KEY = "tetris:endgame-progress:v1"


@dataclass(frozen=True)
class Viewport:
    name: str
    width: int
    height: int
    dpr: int
    touch: bool = False


DESKTOP = Viewport("desktop", 1440, 900, 1)
PORTRAIT = Viewport("portrait", 390, 844, 3, True)
LANDSCAPE = Viewport("landscape", 844, 390, 3, True)
LONG_ENDGAME = Viewport("endgame-long", 360, 800, 3, True)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git_head() -> str:
    return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()


def wait_for_runtime(page: Page, base_url: str) -> None:
    page.goto(base_url, wait_until="networkidle")
    page.wait_for_function("window.__TETRAMORPH_QA__ && window.__TETRAMORPH_LAYOUT_QA__")
    page.wait_for_timeout(80)


def collect(page: Page) -> dict[str, Any]:
    return page.evaluate("window.__TETRAMORPH_LAYOUT_QA__.collect()")


def game_state(page: Page) -> dict[str, Any]:
    return page.evaluate("window.__TETRAMORPH_QA__.getState()")


def runtime(page: Page, expression: str) -> Any:
    return page.evaluate(f"() => {{ const qa = window.__TETRAMORPH_QA__; return qa.{expression}; }}")


def assert_contract(snapshot: dict[str, Any], *, expect_next: bool | None = None, mode_switch: bool = False) -> None:
    assertions = snapshot["assertions"]
    assert assertions["canvasCount"] == 1, snapshot
    assert assertions["domCellCount"] == 0, snapshot
    assert assertions["noOverflow"], snapshot
    assert abs(assertions["boardRatio"] - 2) <= 0.02, snapshot
    assert assertions["touchMinWidth"] >= 44 and assertions["touchMinHeight"] >= 44, snapshot
    assert all(area == 0 for area in assertions["structuralPairwiseIntersection"]), snapshot
    if expect_next is not None:
        assert assertions["nextCount"] == (1 if expect_next else 0), snapshot
        assert (snapshot["renderer"]["previewLayerVisible"] is True) == expect_next, snapshot
    if mode_switch:
        assert assertions["boardText"] == "", snapshot
        assert assertions["previewLayerHidden"], snapshot


def assert_fonts(page: Page) -> None:
    sizes = page.locator("button, p, span, small, strong").evaluate_all(
        "items => items.filter(item => item.textContent.trim()).map(item => Number.parseFloat(getComputedStyle(item).fontSize))"
    )
    assert sizes and min(sizes) >= 12, sizes


def capture(page: Page, output: Path, name: str, errors: list[str], *, expect_next: bool | None = None, mode_switch: bool = False) -> dict[str, Any]:
    # Mobile tap automation can retain a visual-viewport offset after reaching the
    # bottom rail. Reset it before every evidence frame so the page title and
    # board are captured from the same authored origin.
    page.evaluate("""() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
      const app = document.querySelector(".app");
      if (app) app.scrollTop = 0;
      document.activeElement?.blur();
    }""")
    page.wait_for_timeout(20)
    title_bounds = page.locator("[data-testid='brand'] h1").bounding_box()
    viewport_state = page.evaluate("""() => ({
      scrollY: window.scrollY,
      documentTop: document.documentElement.scrollTop,
      bodyTop: document.body.scrollTop,
      visualOffsetTop: window.visualViewport?.offsetTop,
      visualPageTop: window.visualViewport?.pageTop,
      boxes: Object.fromEntries(["html", "body", "#root", ".app", ".game-shell", ".cluster-header", "[data-testid='brand'] h1"].map((selector) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        return [selector, rect ? { y: rect.y, height: rect.height } : null];
      })),
    })""")
    assert title_bounds is not None and title_bounds["y"] >= 0, {"title": title_bounds, "viewport": viewport_state}
    touch_deck = page.locator("[data-testid='touch-deck']")
    if touch_deck.count():
        touch_bounds = touch_deck.bounding_box()
        assert touch_bounds is not None and touch_bounds["y"] >= 0 and touch_bounds["y"] + touch_bounds["height"] <= page.viewport_size["height"], touch_bounds
        touch_labels = touch_deck.locator("small").evaluate_all(
            "items => items.map((item) => { const rect = item.getBoundingClientRect(); return { text: item.textContent, y: rect.y, bottom: rect.bottom }; })"
        )
        assert all(label["y"] >= 0 and label["bottom"] <= page.viewport_size["height"] for label in touch_labels), touch_labels
    snapshot = collect(page)
    assert_contract(snapshot, expect_next=expect_next, mode_switch=mode_switch)
    assert_fonts(page)
    path = output / f"{name}.png"
    page.screenshot(path=str(path), full_page=False)
    return {
        "name": name,
        "state": snapshot["state"],
        "geometry": snapshot,
        "consoleErrors": list(errors),
        "screenshot": str(path.relative_to(ROOT)).replace("\\", "/"),
        "sha256": sha256(path),
    }


def start_playing(page: Page) -> None:
    page.get_by_role("button", name="开始", exact=True).click()
    page.wait_for_function("window.__TETRAMORPH_QA__.getState().status === 'playing'")


def open_endgame_select(page: Page) -> None:
    page.get_by_role("button", name="残局模式", exact=True).click()
    page.get_by_role("button", name="选择关卡", exact=True).click()
    page.wait_for_selector('[data-testid="endgame-select"]')
    assert page.locator('[data-testid="level-row"]').count() == 6
    assert page.locator('[data-testid="level-row"]:not(:disabled)').count() >= 1
    level_list = page.get_by_test_id("level-list")
    level_list.evaluate("element => { element.scrollTop = element.scrollHeight; }")
    last = page.locator('[data-testid="level-row"]').last
    assert last.bounding_box() is not None and last.bounding_box()["bottom"] <= level_list.bounding_box()["bottom"] + 1
    level_list.evaluate("element => { element.scrollTop = 0; }")


def start_first_endgame(page: Page) -> None:
    open_endgame_select(page)
    page.locator('[data-testid="level-row"][data-level-id="t3r-shaft-01"]').click()
    page.get_by_role("button", name="开始关卡", exact=True).click()
    page.wait_for_function("window.__TETRAMORPH_QA__.getState().mode === 'endgame' && window.__TETRAMORPH_QA__.getState().status === 'playing'")


def complete_first_endgame(page: Page) -> None:
    sequence = [
        ("action('rotate-ccw')", 0), ("action('hard-drop')", 3),
        ("action('left')", 0), ("action('left')", 0), ("action('left')", 0), ("action('rotate-ccw')", 0), ("action('left')", 0), ("action('hard-drop')", 3),
        ("action('right')", 0), ("action('right')", 0), ("action('right')", 0), ("action('rotate-cw')", 0), ("action('right')", 0), ("action('hard-drop')", 12),
    ]
    for action, ticks in sequence:
        runtime(page, action)
        if ticks:
            runtime(page, f"advanceTicks({ticks})")
    page.wait_for_function("window.__TETRAMORPH_QA__.getState().endgameCompletion === 'finished'")


def fail_second_endgame(page: Page) -> None:
    runtime(page, "selectEndgame('t3r-shaft-02')")
    runtime(page, "start()")
    for _ in range(4):
        if game_state(page)["status"] != "playing":
            break
        runtime(page, "action('hard-drop')")
        runtime(page, "advanceTicks(12)")
    page.wait_for_function("window.__TETRAMORPH_QA__.getState().endgameCompletion && window.__TETRAMORPH_QA__.getState().endgameCompletion !== 'active'")
    assert game_state(page)["endgameCompletion"] in {"failed-top-out", "failed-invalid-spawn"}


def keyboard_release_probe(page: Page) -> dict[str, int]:
    before = game_state(page)["active"]["y"]
    page.keyboard.down("ArrowUp")
    page.keyboard.up("ArrowUp")
    page.keyboard.down("ArrowDown")
    runtime(page, "advanceTicks(6)")
    dropped = game_state(page)["active"]["y"]
    page.keyboard.up("ArrowDown")
    page.wait_for_timeout(40)
    released = game_state(page)["active"]["y"]
    runtime(page, "advanceTicks(4)")
    stable = game_state(page)["active"]["y"]
    assert dropped > before and stable == released, {"before": before, "dropped": dropped, "released": released, "stable": stable}
    return {"before": before, "dropped": dropped, "released": released, "stable": stable}


def touch_probe(page: Page) -> dict[str, Any]:
    before = game_state(page)
    page.get_by_test_id("touch-rotate-cw").tap()
    page.get_by_test_id("touch-soft-drop").tap()
    page.get_by_test_id("touch-hard-drop").tap()
    runtime(page, "advanceTicks(12)")
    after = game_state(page)
    assert after["pieceCount"] >= before["pieceCount"] + 1, {"before": before, "after": after}
    return {"beforePieces": before["pieceCount"], "afterPieces": after["pieceCount"]}


def set_malformed_progress(page: Page, base_url: str) -> None:
    page.evaluate(f"localStorage.setItem('{PROGRESS_KEY}', '{{bad')")
    page.reload(wait_until="networkidle")
    page.wait_for_function("window.__TETRAMORPH_QA__ && window.__TETRAMORPH_LAYOUT_QA__")
    page.get_by_role("button", name="残局模式", exact=True).click()
    page.get_by_role("button", name="选择关卡", exact=True).click()
    assert page.locator('[data-testid="level-row"]:not(:disabled)').count() == 1


def new_page(browser: Browser, viewport: Viewport, base_url: str) -> tuple[Page, list[str]]:
    context = browser.new_context(
        viewport={"width": viewport.width, "height": viewport.height},
        device_scale_factor=viewport.dpr,
        has_touch=viewport.touch,
        is_mobile=viewport.touch,
    )
    page = context.new_page()
    errors: list[str] = []
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(str(error)))
    wait_for_runtime(page, base_url)
    return page, errors


def desktop_cases(browser: Browser, output: Path, base_url: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    captures: list[dict[str, Any]] = []
    page, errors = new_page(browser, DESKTOP, base_url)
    captures.append(capture(page, output, "desktop-ready", errors, expect_next=False))
    start_playing(page)
    page.keyboard.press("ArrowUp")
    captures.append(capture(page, output, "desktop-playing", errors, expect_next=True))
    page.get_by_role("button", name="暂停", exact=True).click()
    page.wait_for_selector('[data-testid="pause-strip"]')
    captures.append(capture(page, output, "desktop-paused", errors, expect_next=True))
    page.get_by_role("button", name="继续", exact=True).click()
    page.get_by_role("button", name="切换模式", exact=True).click()
    page.wait_for_selector('[data-testid="mode-list"]')
    captures.append(capture(page, output, "desktop-mode-switch", errors, expect_next=False, mode_switch=True))
    page.get_by_role("button", name="返回本局", exact=True).click()
    page.get_by_role("button", name="切换模式", exact=True).click()
    page.get_by_role("button", name="残局模式", exact=True).click()
    page.get_by_role("button", name="应用并重新开始", exact=True).click()
    page.wait_for_selector('[data-testid="endgame-select"]')
    captures.append(capture(page, output, "desktop-endgame-select", errors, expect_next=False))
    page.locator('[data-testid="level-row"][data-level-id="t3r-shaft-01"]').click()
    page.get_by_role("button", name="开始关卡", exact=True).click()
    page.wait_for_function("window.__TETRAMORPH_QA__.getState().mode === 'endgame' && window.__TETRAMORPH_QA__.getState().status === 'playing'")
    keyboard = keyboard_release_probe(page)
    captures.append(capture(page, output, "desktop-endgame-playing", errors, expect_next=True))
    runtime(page, "restart()")
    complete_first_endgame(page)
    page.wait_for_timeout(80)
    stored_progress = page.evaluate(f"JSON.parse(localStorage.getItem('{PROGRESS_KEY}'))")
    assert stored_progress["nextUnlockedLevelId"] == "t3r-shaft-02", stored_progress
    captures.append(capture(page, output, "desktop-endgame-success", errors, expect_next=False))
    page.get_by_role("button", name="返回关卡选择", exact=True).click()
    page.wait_for_selector('[data-testid="endgame-select"]')
    assert page.locator('[data-testid="level-row"]:not(:disabled)').count() == 2
    runtime(page, "selectEndgame('t3r-shaft-02')")
    runtime(page, "start()")
    fail_second_endgame(page)
    captures.append(capture(page, output, "desktop-endgame-failure", errors, expect_next=False))
    assert not errors, errors
    page.context.close()
    return captures, {"keyboardRelease": keyboard, "progress": stored_progress}


def compact_cases(browser: Browser, viewport: Viewport, output: Path, base_url: str) -> list[dict[str, Any]]:
    captures: list[dict[str, Any]] = []
    page, errors = new_page(browser, viewport, base_url)
    start_playing(page)
    captures.append(capture(page, output, f"{viewport.name}-playing", errors, expect_next=True))
    if viewport is PORTRAIT:
        page.get_by_role("button", name="暂停", exact=True).click()
        captures.append(capture(page, output, "portrait-paused", errors, expect_next=True))
        page.get_by_role("button", name="继续", exact=True).click()
    page.get_by_role("button", name="切换模式", exact=True).click()
    page.get_by_role("button", name="残局模式", exact=True).click()
    page.get_by_role("button", name="应用并重新开始", exact=True).click()
    page.wait_for_selector('[data-testid="endgame-select"]')
    captures.append(capture(page, output, f"{viewport.name}-endgame-select", errors, expect_next=False))
    if viewport is PORTRAIT:
        page.locator('[data-testid="level-row"][data-level-id="t3r-shaft-01"]').click()
        page.get_by_role("button", name="开始关卡", exact=True).click()
        captures.append(capture(page, output, "portrait-endgame-playing", errors, expect_next=True))
    assert not errors, errors
    page.context.close()
    return captures


def long_value_case(browser: Browser, output: Path, base_url: str) -> tuple[dict[str, Any], dict[str, Any]]:
    page, errors = new_page(browser, LONG_ENDGAME, base_url)
    runtime(page, "selectEndgame('t3r-cascade-06')")
    runtime(page, "start()")
    touch = touch_probe(page)
    capture_result = capture(page, output, "endgame-long-playing", errors, expect_next=True)
    assert not errors, errors
    page.context.close()
    return capture_result, touch


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:5173")
    parser.add_argument("--stage", choices=("development", "final"), required=True)
    args = parser.parse_args()

    output = EVIDENCE_ROOT / args.stage
    output.mkdir(parents=True, exist_ok=True)
    captures: list[dict[str, Any]] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        desktop, desktop_checks = desktop_cases(browser, output, args.base_url)
        captures.extend(desktop)
        if args.stage == "development":
            # Development is deliberately bounded to the requested four responsive probes.
            captures.extend(compact_cases(browser, PORTRAIT, output, args.base_url))
            captures.extend(compact_cases(browser, LANDSCAPE, output, args.base_url))
        else:
            captures.extend(compact_cases(browser, PORTRAIT, output, args.base_url))
            captures.extend(compact_cases(browser, LANDSCAPE, output, args.base_url))
            long_capture, touch_checks = long_value_case(browser, output, args.base_url)
            captures.append(long_capture)
            malformed_page, malformed_errors = new_page(browser, DESKTOP, args.base_url)
            set_malformed_progress(malformed_page, args.base_url)
            malformed = capture(malformed_page, output, "desktop-malformed-progress", malformed_errors, expect_next=False)
            assert not malformed_errors, malformed_errors
            malformed_page.context.close()
            captures.append(malformed)
        browser.close()

    manifest = {
        "candidateBase": git_head(),
        "stage": args.stage,
        "browser": "Playwright Chromium",
        "result": "passed",
        "checks": {
            "keyboardRelease": desktop_checks["keyboardRelease"],
            "completionUnlock": desktop_checks["progress"],
            "touch": touch_checks if args.stage == "final" else "covered in final pass",
            "screenshots": len(captures),
        },
        "captures": captures,
    }
    manifest_path = output / "browser-evidence.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    sums = [f"{sha256(path)}  {path.name}" for path in sorted(output.glob("*.png"))]
    sums.append(f"{sha256(manifest_path)}  {manifest_path.name}")
    (output / "SHA256SUMS.txt").write_text("\n".join(sums) + "\n", encoding="utf-8")
    print(json.dumps({"result": "passed", "stage": args.stage, "captures": len(captures)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
