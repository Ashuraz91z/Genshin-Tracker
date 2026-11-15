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
        private static readonly NLog.Logger Logger = NLog.LogManager.GetCurrentClassLogger();
        private static void Status(string text, bool ok = true) { Logger.Info(text); UserInterface.Trace(text); StatusChanged?.Invoke(text, ok); }
        private static Connection Load()
        {
            lock (ConfigLock) return File.Exists(ConfigPath) ? JsonConvert.DeserializeObject<Connection>(File.ReadAllText(ConfigPath)) : null;
        }
        internal static string SiteUrl => Load()?.Url ?? "https://genshin.lux-audere.com";
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
            AccountChanged?.Invoke(null);
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
            if (!response.IsSuccessStatusCode) throw new InvalidOperationException("HTTP " + (int)response.StatusCode + " : " + ((string)result["error"] ?? "Requête refusée."));
            return result;
        }
        internal static async Task RefreshAccount()
        {
            try
            {
                var config = Load();
                if (config == null) { Status("Connectez-vous une fois pour retrouver les données du site.", false); return; }
                using (var client = Client(config.Url))
                {
                    client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", Token(config));
                    using (var response = await client.GetAsync("/api/device/account"))
                    {
                        var result = await ReadResponse(response);
                        var current = Load();
                        if (current?.AccountId != config.AccountId || current.Url != config.Url) return;
                        AccountChanged?.Invoke(result);
                        Status("Compte « " + config.Username + " » actualisé : " + result["data"]?["characters"]?.Count() + " personnages, " + result["data"]?["weapons"]?.Count() + " armes, " + result["data"]?["artifacts"]?.Count() + " artéfacts.");
                    }
                }
            }
            catch (Exception ex) { Status("Impossible de relire les données du compte : " + ex.Message + " La connexion mémorisée est conservée. Si l’accès a été révoqué, reconnectez-vous.", false); }
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
        internal static void Enqueue(string goodPath, string reportPath)
        {
            try
            {
                var config = Load();
                if (config == null) { Status("Export local enregistré. Associez un compte dans Connexion pour les prochains scans."); return; }
                string good = File.ReadAllText(goodPath), report = File.ReadAllText(reportPath), scanId;
                using (var sha = SHA256.Create()) scanId = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(good + report))).Replace("-", "");
                var payload = new JObject { ["scanId"] = scanId, ["capturedAt"] = File.GetLastWriteTimeUtc(goodPath).ToString("o"),
                    ["good"] = JObject.Parse(good), ["report"] = JObject.Parse(report) };
                string queue = QueueFolder(config); Directory.CreateDirectory(queue);
                File.WriteAllText(Path.Combine(queue, scanId + ".json"), payload.ToString(Formatting.None));
                Status("Export préparé pour envoi : " + Path.GetFileName(goodPath));
                Task.Run((Func<Task>)SendPending);
            }
            catch (Exception ex) { Status("Export local conservé. Préparation de l’envoi impossible : " + ex.Message, false); }
        }
        internal static async Task SendPending()
        {
            await Sending.WaitAsync();
            try
            {
                var config = Load();
                if (config == null) { Status("Associez votre compte depuis l’onglet Connexion.", false); return; }
                string queue = QueueFolder(config);
                if (!Directory.Exists(queue) || Directory.GetFiles(queue, "*.json").Length == 0) { Status("Connexion mémorisée. Aucun envoi en attente."); await RefreshAccount(); return; }
                string token = Token(config);
                using (var client = Client(config.Url))
                {
                    client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                    foreach (string file in Directory.GetFiles(queue, "*.json"))
                    {
                        Status("Synchronisation du relevé en cours…");
                        using (var response = await client.PostAsync("/api/sync", new StringContent(File.ReadAllText(file), Encoding.UTF8, "application/json")))
                        {
                            var receipt = await ReadResponse(response);
                            if ((bool?)receipt["ok"] != true) throw new InvalidDataException("Accusé de réception invalide.");
                            Status((bool?)receipt["duplicate"] == true ? "Relevé déjà reçu par le site ; aucun doublon ajouté." : "Relevé reçu par le site.");
                            foreach (string line in SyncSummary.Describe(receipt)) Status(line);
                        }
                        File.Delete(file);
                    }
                }
                Status("Envois terminés pour « " + config.Username + " ». Lecture des données enregistrées…");
                await RefreshAccount();
            }
            catch (Exception ex) { Status("Synchronisation interrompue : " + ex.Message + " Les relevés restent en attente ; utilisez Réessayer l’envoi.", false); }
            finally { Sending.Release(); }
        }
    }
}
