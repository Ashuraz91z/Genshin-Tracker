using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace InventoryKamera
{
    public sealed class UploadFailure : Exception
    {
        public int StatusCode { get; }
        public UploadFailure(int code,string message) : base(message) { StatusCode=code; }
    }
    public static class UploadQueue
    {
        public static async Task<int> Send(string folder,Func<string,Task<JObject>> send,Action<string,bool> progress)
        {
            int refused=0;
            foreach(string file in Directory.GetFiles(folder,"*.json").OrderBy(File.GetLastWriteTimeUtc))
            {
                try
                {
                    progress("Synchronisation du relevé " + Path.GetFileName(file) + "…",true);
                    var receipt=await send(File.ReadAllText(file));
                    if((bool?)receipt["ok"]!=true)throw new InvalidDataException("Accusé de réception invalide.");
                    progress((bool?)receipt["duplicate"]==true?"Relevé déjà reçu ; aucun doublon ajouté.":"Relevé reçu par le site.",true);
                    foreach(string line in SyncSummary.Describe(receipt))progress(line,true);
                    File.Delete(file);
                }
                catch(UploadFailure error) when(error.StatusCode==400||error.StatusCode==413||error.StatusCode==415||error.StatusCode==422)
                {
                    refused++;
                    string rejected=Path.Combine(folder,"refused");Directory.CreateDirectory(rejected);
                    string target=Path.Combine(rejected,Path.GetFileName(file));
                    if(File.Exists(target))target+= "."+Guid.NewGuid().ToString("N")+".json";
                    File.WriteAllText(target+".reason.txt",error.Message);
                    File.Move(file,target);
                    progress("Relevé refusé, conservé dans refused : "+error.Message+" Les autres envois continuent.",false);
                }
            }
            return refused;
        }
    }
}
