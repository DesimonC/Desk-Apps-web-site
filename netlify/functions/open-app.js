// Only these confirmed public app addresses may be checked or returned.
const sites = Object.freeze({
  'plate-a-mate': 'plate-a-mate',
  'spice-of-life': 'spice-o-life',
  'poker-compass': 'pokercompass',
  'competition-hunter': 'competition-hunter',
  songuplay: 'songuplay',
  'spacestation-v3': 'spacestation-v3',
  'christmas-in-aisle-7': 'christmas-in-aisle-7'
});
const reply = (statusCode, data) => ({statusCode, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}, body: JSON.stringify(data)});
exports.handler = async event => {
  if (event.httpMethod !== 'GET') return reply(405, {available:false});
  const id = event.queryStringParameters?.app;
  if (!Object.hasOwn(sites, id)) return reply(404, {available:false});
  const url = 'https://' + sites[id] + '.netlify.app/';
  try {
    // Do not follow redirects to unverified hosts or mistake a login page for an app.
    const response = await fetch(url, {redirect:'manual', signal:AbortSignal.timeout(7000), headers:{Accept:'text/html'}});
    if (!response.ok || !/text\/html/i.test(response.headers.get('content-type') || '')) {
      await response.body?.cancel();
      return reply(200, {available:false});
    }
    const html = await response.text();
    if (!html.trim() || /<title[^>]*>\s*(?:site (?:not found|unavailable|paused)|page not found|404)[^<]*<\/title>/i.test(html) || /this site has been paused|this site is paused|site is currently suspended/i.test(html)) return reply(200, {available:false});
    return reply(200, {available:true,url});
  } catch {
    return reply(200, {available:false});
  }
};
