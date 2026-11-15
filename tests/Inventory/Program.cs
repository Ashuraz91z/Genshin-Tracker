using System;
using System.Threading.Tasks;
using InventoryKamera;

var inventory = new Inventory();
Parallel.For(0, 20000, i => { inventory.Add(new Artifact()); inventory.Add(new Weapon()); });
if (inventory.Artifacts.Count != 20000 || inventory.Weapons.Count != 20000)
    throw new Exception("Concurrent OCR results were lost.");
var assembly = typeof(Inventory).Assembly;
foreach (string name in new[] { "InventoryKamera.MainForm.resources", "InventoryKamera.ui.ExecutablesForm.resources", "InventoryKamera.Properties.Resources.resources" })
    if (Array.IndexOf(assembly.GetManifestResourceNames(), name) < 0) throw new Exception("Missing WinForms resource: " + name);
Console.WriteLine("Concurrent inventory retained 40,000 results; all three required WinForms resources are embedded.");

var fallback = ExportDirectory.Resolve(null);
if (!System.IO.Path.IsPathRooted(fallback) || fallback != ExportDirectory.Resolve("   "))
    throw new Exception("Empty export paths must use an absolute default.");
var temp = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "kamera-export-" + Guid.NewGuid());
try
{
    if (ExportDirectory.Prepare("  " + temp + "  ") != temp || !System.IO.Directory.Exists(temp))
        throw new Exception("Export directory was not created.");
    var file = System.IO.Path.Combine(temp, "file");
    System.IO.File.WriteAllText(file, "test");
    try { ExportDirectory.Prepare(file); throw new Exception("A file was accepted as an export directory."); }
    catch (System.IO.IOException) { }
    try { ExportDirectory.Prepare("invalid\0path"); throw new Exception("Invalid export path was accepted."); }
    catch (ArgumentException) { }
}
finally { if (System.IO.Directory.Exists(temp)) System.IO.Directory.Delete(temp, true); }
Console.WriteLine("Export paths: empty default, whitespace, directory creation and invalid paths verified.");
