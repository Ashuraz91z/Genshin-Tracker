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
