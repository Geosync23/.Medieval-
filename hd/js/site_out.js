'use strict';
/* Castle layout 3: the grounds (great court, lower bailey, garden terrace) in master-plan coordinates. */
(function () {
  const h2 = E.h2, CS = Kit.CS, use = Site.use, F = Site.feat, RED = 0xb8323a, BLUE = 0x34508f;
  const gravel = (x, y) => h2(Math.floor(x * 32) >> 1, Math.floor(y * 32) >> 1) < 0.5 ? 0xcfc4a8 : 0xbdb294;
  Site.groundTex = function (x, y) {
    const n = T.fbm(x * 0.5, y * 0.5);
    if (x < 43.5 && y < 43.5) return n > 0.74 ? T.cobble(x, y) : Kit.paving(x, y);          // court and under the keep
    if (y < 43.5) return n > 0.55 ? T.dirt(x, y) : T.cobble(x, y);                           // bailey
    return T.grass(x, y);                                                                     // garden
  };
  Site.grounds.push(function (a) {
    // curtain walls shared by the enclosures
    Kit.curtain('y', 42, 4, 43.5, 4.0, 1.5, { seed: 51, gate: [27.2, 28.8], feats: [F.arch(0.39, 40, 80, false)] });       // court | bailey
    Kit.curtain('x', 42, 4, 42, 4.0, 1.5, { seed: 53, gate: [27.2, 28.8], feats: [F.arch(0.632, 40, 80, false)] });        // court | garden
    Kit.curtain('x', 2.4, 40, 43.5, 4.0, 1.5, { seed: 55 });                                                               // north of the court, east of the range
  });
})();
