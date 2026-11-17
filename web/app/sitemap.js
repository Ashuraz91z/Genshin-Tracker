const base='https://genshin.lux-audere.com';
export default function sitemap(){return ['','/mentions-legales','/confidentialite','/conditions-utilisation','/cookies'].map(path=>({url:base+path,changeFrequency:path?'yearly':'weekly',priority:path?0.3:1}));}
