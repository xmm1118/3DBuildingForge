// 界面图标（内联 SVG，24×24，描边式）。不依赖表情字体，投影和手机上都清楚。
const P = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  site: '<path d="M4 20h16"/><path d="M6 20V9l6-4 6 4v11"/><circle cx="12" cy="12" r="2.2"/><path d="M8.5 8.5a5 5 0 0 1 7 0"/>',
  build: '<path d="M4 20h16"/><path d="M7 20V6h2v14"/><path d="M8 6h11"/><path d="M17 6v5"/><path d="M15.5 11h3v3h-3z"/><path d="M8 6l4-3"/>',
  ops: '<rect x="6" y="3" width="12" height="17" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M3 20h18"/>',
  ws: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9"/>',
  data: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  view: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
  roam: '<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2-6 3 3v3"/><path d="M8 11l3-3 3 2 3 1"/><path d="M11 8l1 7"/>',
  env: '<path d="M7 17a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.3 3.3 0 0 1 17 17z"/><path d="M9 20l-.6 1.5M13 20l-.6 1.5M17 20l-.6 1.5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  learn: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/><path d="M22 9v6"/>',
  help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.3a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2.9-1.2 1.8V15"/><circle cx="12" cy="18" r=".6" fill="currentColor"/>',
  fs: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  // 点位类别
  c_site: '<path d="M4 8h11l4-3v12l-4-3H4z"/><circle cx="9" cy="11" r="1.6"/>',
  c_green: '<path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14z"/><path d="M5 19l8-8"/>',
  c_prefab: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9"/>',
  c_safe: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  c_ops: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  c_gops: '<path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18.4 5.6l-2.1 2.1M21 12h-3"/><path d="M7 21c0-5 2-9 5-9s5 4 5 9"/><path d="M12 12v9"/>'
};
export const icon = (k, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || ''}</svg>`;
