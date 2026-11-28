using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Linq;
using WindowsInput.Native;

namespace InventoryKamera
{
    /// <summary>
    /// Quest log (J), "En cours" tab: the left list is read page by page while scrolling.
    /// Only raw OCR lines are sent; the site turns them into quests (web/lib/quests.mjs), so the parsing is tested there.
    /// Regions are in 1280×720 reference coordinates (calibrated on a 1920×1080 French screenshot, 28/11/2026).
    /// </summary>
    internal static class QuestScraper
    {
        private static readonly NLog.Logger Logger = NLog.LogManager.GetCurrentClassLogger();
        public static VirtualKeyCode questKey = VirtualKeyCode.VK_J;

        internal static List<string[]> Pages { get; } = new List<string[]>();
        internal static void Reset() => Pages.Clear();

        // ponytail: fixed scroll step and page cap, calibrate if pages are skipped (too far) or the log is longer than 30 pages.
        private const int ScrollTicks = 5, MaxPages = 30;

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
                Navigation.Click(At(509, 53)); // "En cours" tab: every quest type in one list
                Navigation.Wait(1200);
                var list = ProfileScraper.Region(97, 97, 543, 660);
                for (int i = 0; i < MaxPages; i++)
                {
                    var lines = ReadPage(list);
                    if (Pages.Count > 0 && lines.SequenceEqual(Pages.Last())) break; // end of the list
                    Pages.Add(lines);
                    Navigation.SetCursor(At(320, 400));
                    Navigation.Scroll(Navigation.Direction.DOWN, ScrollTicks, 30);
                    Navigation.Wait(700);
                }
                UserInterface.Trace("Quêtes : " + Pages.Count + " page(s) du journal lue(s).");
            }
            catch (InvalidOperationException) { throw; } // Genshin lost focus: stop the scan as elsewhere.
            catch (Exception ex) { Logger.Error(ex, "Quest log failed"); UserInterface.AddError("Quêtes : lecture impossible : " + ex.Message); }
            finally { Navigation.MainMenuScreen(); }
        }

        private static string[] ReadPage(Rectangle region)
        {
            using (var image = Prepare(region))
                return (GenshinProcesor.AnalyzeText(image, Tesseract.PageSegMode.SingleColumn, raw: true) ?? "")
                    .Split('\n').Select(l => l.Trim()).Where(l => l.Length > 1).Take(200).Select(l => l.Length > 200 ? l.Substring(0, 200) : l).ToArray();
        }

        /// <summary>Red channel only: white titles and the red "Terminez d'abord…" both stand out from the blue-grey cards.
        /// Thresholded at 110 and enlarged ×2 (checked with Tesseract fra on the reference screenshot).</summary>
        private static Bitmap Prepare(Rectangle region)
        {
            using (var capture = Navigation.CaptureRegion(region))
            {
                if (Properties.Settings.Default.LogScreenshots) try { capture.Save($"./logging/quests_{Pages.Count}.png"); } catch (Exception) { }
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
