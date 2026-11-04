(() => {
  const id = document.currentScript?.dataset.gaId;
  if (!/^G-[A-Z0-9]+$/.test(id || '')) return;

  const key = 'dm-analytics-choice';
  const words = {
    en: ['Cookie settings', 'Your privacy choices', 'Allow analytics to help us understand visits to this site? Your choice is optional and can be changed here anytime.', 'Privacy & cookies', 'Reject analytics', 'Allow analytics'],
    bn: ['কুকি সেটিংস', 'আপনার গোপনীয়তার পছন্দ', 'এই সাইটের ভিজিট বুঝতে অ্যানালিটিক্স অনুমোদন করবেন? এটি ঐচ্ছিক; এখানে যেকোনো সময় পছন্দ বদলাতে পারবেন।', 'গোপনীয়তা ও কুকিজ', 'অ্যানালিটিক্স প্রত্যাখ্যান', 'অ্যানালিটিক্স অনুমোদন'],
    es: ['Configurar cookies', 'Tus opciones de privacidad', '¿Permites que usemos analíticas para entender las visitas a este sitio? Es opcional y puedes cambiar tu elección aquí en cualquier momento.', 'Privacidad y cookies', 'Rechazar analíticas', 'Permitir analíticas'],
    'zh-CN': ['Cookie 设置', '您的隐私选择', '是否允许我们使用分析工具了解本站访问情况？您可以随时在此更改这一自愿选择。', '隐私与 Cookie', '拒绝分析', '允许分析']
  };
  const style = document.createElement('style');
  style.textContent = '.dm-cookie-settings{position:fixed;right:16px;bottom:16px;z-index:1000;padding:9px 12px;background:#172821;color:#fff;border:1px solid #fff8;border-radius:6px;font:14px Arial,sans-serif;cursor:pointer}.dm-cookie-panel{position:fixed;left:16px;bottom:58px;z-index:1001;width:min(430px,calc(100vw - 32px));padding:18px;background:#fff;color:#172821;border:1px solid #829187;border-radius:8px;box-shadow:0 12px 32px #0005;font:16px/1.45 Arial,sans-serif}.dm-cookie-panel h2{margin:0 0 8px;font:600 21px/1.2 Arial,sans-serif}.dm-cookie-panel p{margin:0 0 12px}.dm-cookie-panel a{color:#172821;text-decoration:underline}.dm-cookie-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:15px}.dm-cookie-actions button{min-height:48px;padding:8px;background:#172821;color:#fff;border:1px solid #172821;border-radius:5px;font:600 14px Arial,sans-serif;cursor:pointer}.dm-cookie-actions button:first-child{background:#fff;color:#172821}.dm-cookie-settings:focus-visible,.dm-cookie-panel :focus-visible{outline:3px solid #bd862b;outline-offset:3px}[hidden].dm-cookie-panel{display:none}';
  document.head.append(style);
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'dm-cookie-settings';
  const panel = document.createElement('section');
  panel.className = 'dm-cookie-panel';
  panel.setAttribute('aria-labelledby', 'dm-cookie-title');
  const title = document.createElement('h2');
  title.id = 'dm-cookie-title';
  const description = document.createElement('p');
  const privacy = document.createElement('a');
  privacy.href = 'https://www.dhanmondiplaza.com/privacy#cookies';
  const actions = document.createElement('div');
  actions.className = 'dm-cookie-actions';
  const reject = document.createElement('button');
  const allow = document.createElement('button');
  reject.type = allow.type = 'button';
  actions.append(reject, allow);
  panel.append(title, description, privacy, actions);
  document.body.append(settings, panel);

  const translate = () => {
    const lang = document.documentElement.lang;
    const t = words[lang] || words.en;
    [settings, title, description, privacy, reject, allow].forEach((el, i) => { el.textContent = t[i]; });
  };
  translate();
  new MutationObserver(translate).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});

  let saved;
  try { saved = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
  const current = saved && Date.now() - saved.at < 180 * 86400000 ? saved.choice : null;
  panel.hidden = current === 'accepted' || current === 'rejected';
  settings.addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) reject.focus(); });
  const start = () => {
    if (document.getElementById('dm-google-analytics')) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id);
    const script = document.createElement('script');
    script.id = 'dm-google-analytics';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.append(script);
  };
  const choose = (choice) => {
    try { localStorage.setItem(key, JSON.stringify({choice, at: Date.now()})); } catch {}
    panel.hidden = true;
    settings.focus();
    if (choice === 'accepted') start();
    else if (document.getElementById('dm-google-analytics')) {
      window[`ga-disable-${id}`] = true;
      document.cookie.split(';').forEach((part) => {
        const name = part.trim().split('=')[0];
        if (/^_ga(?:_|$)/.test(name)) document.cookie = `${name}=; Max-Age=0; Path=/`;
      });
      location.reload();
    }
  };
  reject.addEventListener('click', () => choose('rejected'));
  allow.addEventListener('click', () => choose('accepted'));
  if (current === 'accepted') start();
})();

