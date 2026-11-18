const config={
  output:'standalone',
  poweredByHeader:false,
  outputFileTracingExcludes:{'/*':['./data/**/*','./test/**/*','./.env*']},
  async headers(){return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Frame-Options',value:'DENY'},{key:'Referrer-Policy',value:'same-origin'},{key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com" "https://checkout.stripe.com")'}]}];}
};
export default config;
