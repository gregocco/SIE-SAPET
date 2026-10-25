// Lever / coucher du soleil et fuseaux horaires (été, UTC+1 à UTC+3). L'horloge de référence est l'heure de Chambley (UTC+2).
(function (g) {
  const REF_OFFSET = 2; // heure de Chambley = UTC+2 en août
  const D2R = Math.PI / 180;
  const cache = new Map();

  function dayOfYear(y, m, d) { return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86400000); }

  // Algorithme classique (Almanac for Computers) ; renvoie des heures UTC, NaN si le soleil ne se lève / couche pas
  function utcTime(lat, lon, N, rising) {
    const lngHour = lon / 15;
    const t = N + ((rising ? 6 : 18) - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    let Lg = M + 1.916 * Math.sin(M * D2R) + 0.02 * Math.sin(2 * M * D2R) + 282.634;
    Lg = ((Lg % 360) + 360) % 360;
    let RA = Math.atan(0.91764 * Math.tan(Lg * D2R)) / D2R;
    RA = ((RA % 360) + 360) % 360;
    RA += Math.floor(Lg / 90) * 90 - Math.floor(RA / 90) * 90;
    RA /= 15;
    const sinDec = 0.39782 * Math.sin(Lg * D2R), cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(90.833 * D2R) - sinDec * Math.sin(lat * D2R)) / (cosDec * Math.cos(lat * D2R));
    if (cosH > 1 || cosH < -1) return NaN;
    const H = (rising ? 360 - Math.acos(cosH) / D2R : Math.acos(cosH) / D2R) / 15;
    const T = H + RA - 0.06571 * t - 6.622;
    return (((T - lngHour) % 24) + 24) % 24;
  }

  // lever / coucher en heures de l'horloge de référence pour le jour d (0 = J1), d1 = 'YYYY-MM-DD'
  function times(lat, lon, d1, d) {
    const key = `${Math.round(lat * 4)}|${Math.round(lon * 4)}|${d1}|${d}`;
    if (cache.has(key)) return cache.get(key);
    const dt = new Date(Date.parse(d1 + 'T00:00:00Z') + d * 86400000);
    const N = dayOfYear(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    let rise = utcTime(lat, lon, N, true) + REF_OFFSET, set = utcTime(lat, lon, N, false) + REF_OFFSET;
    if (!isFinite(rise)) { rise = 0; set = 24; } // soleil de minuit
    if (set < rise) set += 24;
    if (rise >= 24) { rise -= 24; set -= 24; }
    const out = { rise, set };
    cache.set(key, out);
    return out;
  }

  // fuseau d'été du lieu : point de repère le plus proche (précis à quelques dizaines de km des frontières)
  const ANCHORS = [
    [51.5, -0.1, 1], [53.3, -6.3, 1], [38.7, -9.1, 1], [37.2, -8.0, 1], [64.1, -21.9, 0],
    [40.4, -3.7, 2], [41.4, 2.2, 2], [37.4, -5.98, 2], [48.9, 2.3, 2], [43.3, -0.4, 2], [43.3, 5.4, 2], [49.0, 5.9, 2],
    [52.5, 13.4, 2], [48.1, 11.6, 2], [50.1, 8.7, 2], [53.6, 10.0, 2], [52.4, 4.9, 2], [50.8, 4.4, 2],
    [45.5, 9.2, 2], [41.9, 12.5, 2], [38.1, 15.6, 2], [37.5, 15.1, 2], [39.2, 9.1, 2], [42.0, 9.0, 2],
    [47.4, 8.5, 2], [47.1, 15.4, 2], [48.2, 16.4, 2], [50.1, 14.4, 2], [48.1, 17.1, 2], [47.5, 19.0, 2],
    [52.2, 21.0, 2], [50.1, 19.9, 2], [54.4, 18.6, 2], [55.7, 12.6, 2], [56.2, 10.2, 2], [59.9, 10.8, 2], [63.4, 10.4, 2],
    [58.0, 7.0, 2], [60.4, 5.3, 2], [59.3, 18.1, 2], [57.7, 12.0, 2], [56.2, 15.6, 2], [61.2, 17.3, 2], [65.6, 22.1, 2],
    [46.1, 14.5, 2], [45.8, 16.0, 2], [44.8, 20.5, 2], [43.9, 18.4, 2], [42.4, 19.3, 2], [41.3, 19.8, 2], [42.0, 21.4, 2],
    [44.1, 15.2, 2], [45.3, 13.6, 2], [44.4, 26.1, 3], [45.7, 21.2, 3], [46.8, 23.6, 3], [42.7, 23.3, 3], [42.3, 24.6, 3],
    [38.0, 23.7, 3], [40.6, 22.9, 3], [39.6, 19.9, 3], [39.4, 20.4, 3], [36.4, 28.2, 3], [37.0, 25.5, 3], [35.3, 25.1, 3],
    [60.2, 24.9, 3], [59.4, 24.7, 3], [56.9, 24.1, 3], [54.7, 25.3, 3], [64.0, 25.0, 3],
  ];
  function tzOffset(lat, lon) {
    let best = 1e9, off = 2;
    const cl = Math.cos(lat * D2R);
    for (const [a, b, o] of ANCHORS) {
      const d = (a - lat) ** 2 + ((b - lon) * cl) ** 2;
      if (d < best) { best = d; off = o; }
    }
    return off;
  }

  g.SUN = { times, tzOffset, REF_OFFSET };
})(window);
