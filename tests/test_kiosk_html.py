import re
import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
KIOSK_HTML = ROOT / "yildiz-ai-kiosk.html"


class DocumentParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        self.ids = set()
        self.script_count = 0

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
        attributes = dict(attrs)
        if "id" in attributes:
            self.ids.add(attributes["id"])
        if tag == "script":
            self.script_count += 1


class KioskHtmlTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = KIOSK_HTML.read_text(encoding="utf-8")
        cls.parser = DocumentParser()
        cls.parser.feed(cls.source)

    def test_document_has_expected_application_shell(self):
        self.assertIn("<!DOCTYPE html>", self.source)
        self.assertIn('<html lang="tr"', self.source)
        self.assertIn("</html>", self.source)
        self.assertEqual(self.parser.ids & {"app", "topbar", "stage", "mobile-root", "modal-root", "toast"},
                         {"app", "topbar", "stage", "mobile-root", "modal-root", "toast"})

    def test_document_contains_one_embedded_application_script(self):
        self.assertEqual(self.parser.script_count, 1)
        self.assertRegex(self.source, re.compile(r"<script>\s*.*\s*</script>", re.DOTALL))
        self.assertIn("function boot()", self.source)
        self.assertIn("DOMContentLoaded", self.source)

    def test_design_navigation_targets_are_supported(self):
        navigation_targets = set(re.findall(r"\['([a-z]+(?:\.[a-z]+)?|home)',\s*'[^']+'\]", self.source))
        screen_targets = set(re.findall(r'data-screen="([^"]+)"', self.source))

        self.assertIn("home", navigation_targets)
        self.assertTrue({"photo", "career", "lab"} <= {
            target.split(".", 1)[0] for target in navigation_targets if "." in target
        })
        self.assertTrue({"home", "photo.quiz", "career.name", "lab.base"} <= screen_targets | navigation_targets)


if __name__ == "__main__":
    unittest.main()
