using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace InventoryKamera
{
    internal static class ClientSync
    {
        private sealed class Connection
        {
            public string Url, ProtectedToken, AccountId, Username;
        }
        private static readonly string Folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GenshinTracker");
        private static readonly string ConfigPath = Path.Combine(Folder, "connection.json");
        private static readonly SemaphoreSlim Sending = new SemaphoreSlim(1, 1);
        private static readonly object ConfigLock = new object();
        internal static Action<string, bool> StatusChanged;
        internal static Action<JObject> AccountChanged;
        internal static bool AccessRejected { get; private set; }
        private static readonly NLog.Logger Logger = NLog.LogManager.GetCurrentClassLogger();
        private static void Status(string text, bool ok = true) { Logger.Info(text); UserInterface.Trace(text); StatusChanged?.Invoke(text, ok); }
        private static Connection Load()
        {
            lock (ConfigLock) return File.Exists(ConfigPath) ? JsonConvert.DeserializeObject<Connection>(File.ReadAllText(ConfigPath)) : null;
        }
        internal static string SiteUrl => Load()?.Url ?? "https://genshin-tracker.com";
        internal static string AccountName => Load()?.Username;
        private static string ValidateUrl(string input)
        {
            if (!Uri.TryCreate(input?.Trim(), UriKind.Absolute, out var uri) ||
                !(uri.Scheme == "https" || (uri.Scheme == "http" && uri.IsLoopback)) ||
                !string.IsNullOrEmpty(uri.UserInfo) || !string.IsNullOrEmpty(uri.Query) ||
                !string.IsNullOrEmpty(uri.Fragment) || uri.AbsolutePath != "/")
                throw new ArgumentException("Utilisez l’adresse HTTPS du site (HTTP permis uniquement sur localhost). Sans chemin ni identifiants.");
            return uri.GetLeftPart(UriPartial.Authority);
        }
        private static HttpClient Client(string url)
        {
            return new HttpClient(new HttpClientHandler { AllowAutoRedirect = false })
            { BaseAddress = new Uri(ValidateUrl(url)), Timeout = TimeSpan.FromSeconds(30) };
        }
        internal static async Task Pair(string url, string code)
        {
            url = ValidateUrl(url);
            if (string.IsNullOrWhiteSpace(code)) throw new ArgumentException("Saisissez le code créé sur le site.");
            using (var client = Client(url))
            using (var response = await client.PostAsync("/api/device/pair", new StringContent(
                JsonConvert.SerializeObject(new { code = code.Trim(), deviceName = Environment.MachineName }), Encoding.UTF8, "application/json")))
            {
                string text = await response.Content.ReadAsStringAsync();
                var result = JObject.Parse(text);
                if (!response.IsSuccessStatusCode) throw new InvalidOperationException((string)result["error"] ?? "Association refusée.");
                SaveConnection(url, result);
                Status("Associé au compte « " + (string)result["username"] + " ». Connexion mémorisée sur ce PC.");
            }
            await SendPending();
        }
        private static string Token(Connection config) => Encoding.UTF8.GetString(ProtectedData.Unprotect(Convert.FromBase64String(config.ProtectedToken), null, DataProtectionScope.CurrentUser));
        private static void SaveConnection(string url, JObject result)
        {
            string token = (string)result["token"], accountId = (string)result["accountId"];
            if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(accountId) || accountId.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
                throw new InvalidDataException("Réponse de connexion invalide.");
            var config = new Connection { Url = url, AccountId = accountId, Username = (string)result["username"],
                ProtectedToken = Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(token), null, DataProtectionScope.CurrentUser)) };
            lock (ConfigLock)
            {
                Directory.CreateDirectory(Folder);
                string temporary = ConfigPath + ".tmp";
                File.WriteAllText(temporary, JsonConvert.SerializeObject(config));
                if (File.Exists(ConfigPath)) File.Replace(temporary, ConfigPath, null);
                else File.Move(temporary, ConfigPath);
            }
            AccessRejected=false;
            AccountChanged?.Invoke(null);
        }
        // Forgets the account on this PC only: the saved key is deleted, local exports stay. The PC can also be unlinked from the site.
        internal static void SignOut()
        {
            lock (ConfigLock) { if (File.Exists(ConfigPath)) File.Delete(ConfigPath); }
            AccessRejected = false;
            Status("Déconnecté de ce PC. Les exports locaux sont conservés ; reconnectez-vous pour reprendre les envois.");
        }
        internal static async Task Login(string url, string name, string password)
        {
            url = ValidateUrl(url);
            using (var client = Client(url))
            {
                var config = Load();
                if (config?.Url == url)
                {
                    try { client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", Token(config)); }
                    catch (CryptographicException) { /* Re-authentication replaces an unreadable saved key. */ }
                }
                Status("Connexion au compte du tracker…");
                using (var response = await client.PostAsync("/api/device/login", new StringContent(
                    JsonConvert.SerializeObject(new { name, password, deviceName = Environment.MachineName }), Encoding.UTF8, "application/json")))
                {
                    var result = await ReadResponse(response);
                    SaveConnection(url, result);
                    Status("Connecté à « " + (string)result["username"] + " ». Connexion mémorisée ; le mot de passe n’est pas enregistré.");
                }
            }
            await SendPending();
        }
        private static async Task<JObject> ReadResponse(HttpResponseMessage response)
        {
            string text = await response.Content.ReadAsStringAsync();
            JObject result;
            try { result = JObject.Parse(text); }
            catch (JsonReaderException) { throw new InvalidDataException("Le site ne renvoie pas une réponse JSON valide (HTTP " + (int)response.StatusCode + "). Vérifiez son adresse et son déploiement."); }
            if (!response.IsSuccessStatusCode) throw new UploadFailure((int)response.StatusCode,"HTTP " + (int)response.StatusCode + " : " + ((string)result["error"] ?? "Requête refusée."));
            return result;
        }
        private static bool IsCurrent(Connection config)
        {
            var current=Load();
            return current!=null&&config!=null&&current.AccountId==config.AccountId&&current.Url==config.Url&&current.ProtectedToken==config.ProtectedToken;
        }
        internal static async Task RefreshAccount()
        {
            Connection config=null;
            try
            {
                config = Load();
                if (config == null) { Status("Connectez-vous une fois pour retrouver les données du site.", false); return; }
                using (var client = Client(config.Url))
                {
                    client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", Token(config));
                    using (var response = await client.GetAsync("/api/device/account"))
                    {
                        var result = await ReadResponse(response);
                        if (!IsCurrent(config)) return;
                        AccessRejected=false;
                        AccountChanged?.Invoke(result);
                        Status("Compte « " + config.Username + " » actualisé : " + result["data"]?["characters"]?.Count() + " personnages, " + result["data"]?["weapons"]?.Count() + " armes, " + result["data"]?["artifacts"]?.Count() + " artéfacts.");
                    }
                }
            }
            catch (Exception ex) { if(!IsCurrent(config))return;if(ex is UploadFailure failure&&failure.StatusCode==401)AccessRejected=true;Status("Impossible de relire les données du compte : " + ex.Message + " Les données locales sont conservées. Reconnectez-vous si l’accès est refusé.", false); }
        }
        private static string QueueFolder(Connection config)
        {
            // Bind pending scans to both the account and site; changing accounts cannot upload old data.
            using (var sha = SHA256.Create())
            {
                string identity = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(config.Url + "|" + config.AccountId))).Replace("-", "");
                return Path.Combine(Folder, "outbox", identity);
            }
        }
        private static int OtherPending(Connection config)
        {
            string root=Path.Combine(Folder,"outbox"),current=QueueFolder(config);
            return Directory.Exists(root)?Directory.GetDirectories(root).Where(path=>path!=current).Sum(path=>Directory.GetFiles(path,"*.json").Length):0;
        }
        internal static void SendExisting(string path)
        {
            if(Load()==null)throw new InvalidOperationException("Connectez-vous au compte destinataire avant d’envoyer un fichier.");
            var good=JObject.Parse(File.ReadAllText(path));
            if((string)good["format"]!="GOOD")throw new InvalidDataException("Choisissez le fichier GOOD .json, pas son .rapport.json.");
            Enqueue(path,Path.ChangeExtension(path,".rapport.json"));
        }
        internal static void Enqueue(string goodPath, string reportPath)
        {
            try
            {
                var config = Load();
                if (config == null) { Status("Export local enregistré. Associez un compte dans Connexion pour les prochains scans."); return; }
                string good = File.ReadAllText(goodPath), report = File.Exists(reportPath)?File.ReadAllText(reportPath):"{}", scanId;
                using (var sha = SHA256.Create()) scanId = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(good + report))).Replace("-", "");
                var payload = new JObject { ["scanId"] = scanId, ["capturedAt"] = File.GetLastWriteTimeUtc(goodPath).ToString("o"),
                    ["good"] = JObject.Parse(good), ["report"] = JObject.Parse(report) };
                string queue = QueueFolder(config); Directory.CreateDirectory(queue);
                string destination=Path.Combine(queue,scanId+".json"),temporary=destination+"."+Guid.NewGuid().ToString("N")+".tmp";
                try { File.WriteAllText(temporary,payload.ToString(Formatting.None));if(!File.Exists(destination))File.Move(temporary,destination); }
                finally { if(File.Exists(temporary))File.Delete(temporary); }
                Status("Export préparé pour envoi : " + Path.GetFileName(goodPath));
                Task.Run((Func<Task>)SendPending);
            }
            catch (Exception ex) { Status("Export local conservé. Préparation de l’envoi impossible : " + ex.Message, false); }
        }
        internal static async Task SendPending()
        {
            await Sending.WaitAsync();
            Connection config=null;
            try
            {
                config = Load();
                if (config == null) { Status("Associez votre compte depuis l’onglet Connexion.", false); return; }
                string queue = QueueFolder(config);
                int other=OtherPending(config);
                if(other>0)Status(other+" relevé(s) restent liés à une ancienne connexion. Utilisez Envoyer un fichier GOOD existant pour choisir celui à envoyer à ce compte.",false);
                if (!Directory.Exists(queue) || Directory.GetFiles(queue, "*.json").Length == 0) { Status("Aucun envoi en attente pour ce compte."+(other>0?" Des relevés d’une ancienne connexion restent sur le PC.":"")); await RefreshAccount(); return; }
                string token = Token(config);
                int refused=0;
                using (var client = Client(config.Url))
                {
                    client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                    refused=await UploadQueue.Send(queue,async payload=>
                    {
                        using(var response=await client.PostAsync("/api/sync",new StringContent(payload,Encoding.UTF8,"application/json")))
                        {
                            return await ReadResponse(response);
                        }
                    },(text,ok)=>{if(IsCurrent(config))Status(text,ok);});
                }

                if(!IsCurrent(config))return;
                Status("Envois terminés pour « " + config.Username + " ». Lecture des données enregistrées…");
                await RefreshAccount();
                if(refused>0)Status(refused+" relevé(s) refusé(s), conservés avec leur motif dans la file locale. Consultez Journal et erreurs.",false);
            }
            catch (Exception ex) { if(!IsCurrent(config))return;if(ex is UploadFailure failure&&failure.StatusCode==401)AccessRejected=true;Status("Synchronisation interrompue : " + ex.Message + " Les relevés restent en attente. "+(AccessRejected?"Reconnectez-vous ; ne relancez pas le scan.":"Nouvelle tentative automatique sous 30 secondes, ou Réessayer l’envoi."), false); }
            finally { Sending.Release(); }
        }
    }
}
