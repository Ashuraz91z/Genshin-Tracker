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

var reportType=assembly.GetType("InventoryKamera.ScanReport",true);
var nonPublic=System.Reflection.BindingFlags.NonPublic|System.Reflection.BindingFlags.Static;
var reset=reportType.GetMethod("Reset",nonPublic);
var progress=reportType.GetMethod("Progress",nonPublic);
reset.Invoke(null,null);
for(int i=0;i<550;i++) progress.Invoke(null,new object[]{"Étape "+i});
var events=reportType.GetField("Events",nonPublic).GetValue(null);
if((int)events.GetType().GetProperty("Count").GetValue(events)!=500)throw new Exception("Progress history must remain bounded.");
if((bool)reportType.GetProperty("HasErrors",nonPublic).GetValue(null))throw new Exception("Progress messages must not mark valid scans as failed.");
reset.Invoke(null,null);
if((int)events.GetType().GetProperty("Count").GetValue(events)!=0)throw new Exception("Previous scan events leaked into a new report.");
Console.WriteLine("Scan journal: bounded progress, error separation and reset verified.");

var receipt=Newtonsoft.Json.Linq.JObject.Parse("{\"counts\":{\"characters\":0,\"weapons\":12},\"applied\":{\"characters\":\"empty_scan\",\"weapons\":\"preserved_previous\"}}");
var summary=string.Join("\n",SyncSummary.Describe(receipt));
if(!summary.Contains("Personnages : 0 reçus")||!summary.Contains("aucune donnée lisible")||!summary.Contains("ancien inventaire conservé"))throw new Exception("Sync receipt hid a preserved or empty category.");
Console.WriteLine("Sync receipts explain empty scans, received counts and preserved inventory.");

var queue=System.IO.Path.Combine(System.IO.Path.GetTempPath(),"kamera-queue-"+Guid.NewGuid());System.IO.Directory.CreateDirectory(queue);
try
{
    var bad=System.IO.Path.Combine(queue,"a.json");var good=System.IO.Path.Combine(queue,"b.json");
    System.IO.File.WriteAllText(bad,"bad");System.IO.File.WriteAllText(good,"good");
    var delivered=0;
    await UploadQueue.Send(queue,payload=>{
        if(payload=="bad")throw new UploadFailure(400,"Invalid old scan");
        delivered++;return Task.FromResult(Newtonsoft.Json.Linq.JObject.Parse("{\"ok\":true}"));
    },(text,ok)=>{});
    if(delivered!=1||System.IO.File.Exists(good)||!System.IO.File.Exists(System.IO.Path.Combine(queue,"refused","a.json")))throw new Exception("A rejected old scan blocked a valid upload.");
    System.IO.File.WriteAllText(good,"retry");
    foreach(var code in new[]{401,429,503})
    {
        try{await UploadQueue.Send(queue,payload=>throw new UploadFailure(code,"Retry required"),(text,ok)=>{});throw new Exception("Transient/auth failures must stop the batch.");}catch(UploadFailure failure)when(failure.StatusCode==code){}
        if(!System.IO.File.Exists(good))throw new Exception("Pending scan was lost after an auth/network error.");
    }
    await UploadQueue.Send(queue,payload=>Task.FromResult(Newtonsoft.Json.Linq.JObject.Parse("{\"ok\":true,\"duplicate\":true}")),(text,ok)=>{});
    if(System.IO.File.Exists(good))throw new Exception("Acknowledged duplicate was not removed from the queue.");
}
finally{System.IO.Directory.Delete(queue,true);}
Console.WriteLine("Upload queue: rejected scans isolated; 401/429/503 preserved; acknowledged retries removed.");

var validRolls=new System.Collections.Generic.List<Artifact.SubStat>{new Artifact.SubStat{stat="critRate_",value=3.5m}};
var testArtifact=new Artifact("OceanHuedClam",5,0,"flower","hp",validRolls);
if(!testArtifact.HasValidSubStats())throw new Exception("A valid substat was rejected.");
foreach(var roll in new[]{new Artifact.SubStat{stat="",value=3.5m},new Artifact.SubStat{stat="critRate_",value=-1},new Artifact.SubStat{stat="bad",value=10}})
 if(new Artifact("OceanHuedClam",5,0,"flower","hp",new System.Collections.Generic.List<Artifact.SubStat>{roll}).HasValidSubStats())throw new Exception("Malformed OCR stat was accepted for export.");
var nested=new AggregateException(new ArgumentOutOfRangeException("index","line gap"));
string explained=OcrFailure.Describe(nested);
if(!explained.Contains("ArgumentOutOfRangeException")||!explained.Contains("line gap"))throw new Exception("OCR aggregate hid its actionable cause.");
Console.WriteLine("Artifact export rejects invalid keys/values; aggregate OCR errors retain the exact exception.");

var ownerParser=assembly.GetType("InventoryKamera.FrenchRecognition",true).GetMethod("ReadEquippedCharacter",nonPublic);
var reference=Newtonsoft.Json.Linq.JObject.Parse(System.IO.File.ReadAllText("InventoryKamera-FR/InventoryKamera/inventorylists/characters.json"));
Func<string,string> ownerLookup=name=>(string)reference[name]?["GOOD"];
string kokomi=(string)ownerParser.Invoke(null,new object[]{"Équipé par Sangonomiya Kokomi",ownerLookup});
if(kokomi!="SangonomiyaKokomi")throw new Exception("Real character reference did not resolve Kokomi.");
var linkedWeapon=new Weapon("PrototypeAmber",70,false,1,false,kokomi,1,4);
var linkedArtifact=new Artifact("OceanHuedClam",5,20,"flower","hp",validRolls,kokomi);
foreach(object item in new object[]{linkedWeapon,linkedArtifact})
 if((string)Newtonsoft.Json.Linq.JObject.FromObject(item)["location"]!="SangonomiyaKokomi")throw new Exception("Equipped owner was lost during GOOD serialization.");
Console.WriteLine("Real Kokomi reference resolves the French equipment label and remains in weapon/artifact GOOD location.");

string skirk=(string)ownerParser.Invoke(null,new object[]{"Équipé par Skirk",ownerLookup});
var skirkCirclet=new Artifact("FinaleOfTheDeepGalleries",5,20,"circlet","critRate_",validRolls,skirk,1,true);
if(skirk!="Skirk"||(string)Newtonsoft.Json.Linq.JObject.FromObject(skirkCirclet)["location"]!="Skirk")
 throw new Exception("The artifact1 Skirk owner was lost during French parsing or GOOD export.");
Console.WriteLine("Real artifact1 Skirk label resolves and remains in GOOD location.");
