const base='https://genshin-tracker.com';
export default function sitemap(){return ['','/mentions-legales','/confidentialite','/conditions-utilisation','/cookies','/aide','/roadmap'].map(path=>({url:base+path,changeFrequency:path?'yearly':'weekly',priority:path?0.3:1}));}
