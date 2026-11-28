using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Linq;
using WindowsInput.Native;

namespace InventoryKamera
{
    /// <summary>
    /// Quest log (J): every tab is read in turn (E = next tab). In each tab the list is scrolled back to the top,
    /// then read page by page while scrolling down.
    /// Only raw OCR lines are sent, grouped by tab; the site turns them into quests (web/lib/quests.mjs), so the parsing is tested there.
    /// Regions are in 1280×720 reference coordinates (calibrated on a 1920×1080 French screenshot, 28/11/2026).
    /// </summary>
    internal static class QuestScraper
    {
        private static readonly NLog.Logger Logger = NLog.LogManager.GetCurrentClassLogger();
        public static VirtualKeyCode questKey = VirtualKeyCode.VK_J, nextTabKey = VirtualKeyCode.VK_E;

        /// <summary>One entry per tab, each a list of pages of OCR lines.</summary>
        internal static List<List<string[]>> Tabs { get; } = new List<List<string[]>>();
        internal static void Reset() => Tabs.Clear();

        // ponytail: fixed scroll steps and caps, calibrate if pages are skipped (too far) or a tab is longer than 30 pages.
        private const int ScrollTicks = 5, TopTicks = 60, MaxPages = 30, MaxTabs = 8;

        /// <summary>Starts and ends with the Paimon menu open.</summary>
        internal static void Scan()
        {
            Reset();
            try
            {
                Navigation.KeyPress(Navigation.escapeKey);
                Navigation.SystemWait(Navigation.Speed.UI);
                Navigation.KeyPress(questKey);
                Navigation.Wait(2500);
                var list = ProfileScraper.Region(97, 97, 543, 660);
                var seen = new List<string>(); // first page of each tab read: the same one again means E went back round
                int empty = 0;
                for (int tab = 0; tab < MaxTabs; tab++)
                {
                    if (tab > 0) { Navigation.KeyPress(nextTabKey); Navigation.Wait(1200); }
                    var pages = ReadTab(list);
                    string first = string.Join("\n", pages.FirstOrDefault() ?? new string[0]);
                    if (first.Length == 0) { if (++empty >= 2) break; continue; } // empty tab; two in a row = nothing left
                    if (seen.Contains(first)) break;
                    seen.Add(first);
                    empty = 0;
                    Tabs.Add(pages);
                }
                UserInterface.Trace("Quêtes : " + Tabs.Count + " onglet(s) du journal lu(s), " + Tabs.Sum(t => t.Count) + " page(s).");
            }
            catch (InvalidOperationException) { throw; } // Genshin lost focus: stop the scan as elsewhere.
            catch (Exception ex) { Logger.Error(ex, "Quest log failed"); UserInterface.AddError("Quêtes : lecture impossible : " + ex.Message); }
            finally { Navigation.MainMenuScreen(); }
        }

        /// <summary>Back to the top of the list (it is not always there), then down page by page until two reads match.</summary>
        private static List<string[]> ReadTab(Rectangle list)
        {
            var pages = new List<string[]>();
            Navigation.SetCursor(At(320, 400));
            Navigation.Scroll(Navigation.Direction.UP, TopTicks, 10);
            Navigation.Wait(700);
            for (int i = 0; i < MaxPages; i++)
            {
                var lines = ReadPage(list, pages.Count);
                if (pages.Count > 0 && lines.SequenceEqual(pages.Last())) break; // end of the list
                pages.Add(lines);
                Navigation.SetCursor(At(320, 400));
                Navigation.Scroll(Navigation.Direction.DOWN, ScrollTicks, 30);
                Navigation.Wait(700);
            }
            return pages;
        }

        private static string[] ReadPage(Rectangle region, int page)
        {
            using (var image = Prepare(region, page))
                return (GenshinProcesor.AnalyzeText(image, Tesseract.PageSegMode.SingleColumn, raw: true) ?? "")
                    .Split('\n').Select(l => l.Trim()).Where(l => l.Length > 1).Take(200).Select(l => l.Length > 200 ? l.Substring(0, 200) : l).ToArray();
        }

        /// <summary>Red channel only: white titles and the red "Terminez d'abord…" both stand out from the blue-grey cards.
        /// Thresholded at 110 and enlarged ×2 (checked with Tesseract fra on the reference screenshot).</summary>
        private static Bitmap Prepare(Rectangle region, int page)
        {
            using (var capture = Navigation.CaptureRegion(region))
            {
                if (Properties.Settings.Default.LogScreenshots) try { capture.Save($"./logging/quests_{Tabs.Count}_{page}.png"); } catch (Exception) { }
                UserInterface.SetNavigation_Image(capture);
                using (var mask = new Bitmap(capture.Width, capture.Height))
                {
                    for (int x = 0; x < capture.Width; x++)
                        for (int y = 0; y < capture.Height; y++)
                            mask.SetPixel(x, y, capture.GetPixel(x, y).R > 110 ? Color.Black : Color.White);
                    var large = new Bitmap(mask.Width * 2, mask.Height * 2);
                    using (var g = Graphics.FromImage(large)) { g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.DrawImage(mask, 0, 0, large.Width, large.Height); }
                    return large;
                }
            }
        }

        private static Point At(int x, int y) => new Point((int)(x / 1280.0 * Navigation.GetWidth()), (int)(y / 720.0 * Navigation.GetHeight()));
    }
}
