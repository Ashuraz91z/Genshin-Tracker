// SITE_ENV=dev: the test site stays out of search engines.
export default function robots(){if(process.env.SITE_ENV==='dev')return {rules:{userAgent:'*',disallow:'/'}};return {rules:{userAgent:'*',allow:'/',disallow:['/api/','/app','/characters','/inventory','/teams','/advice','/collection','/quests','/sync']},sitemap:'https://genshin-tracker.com/sitemap.xml'};}
