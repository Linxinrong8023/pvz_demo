let gifHost = null;

function ensureGifHost() {
  if (typeof document === "undefined") return null;
  if (gifHost && gifHost.isConnected) return gifHost;

  const existing = document.getElementById("pvz-gif-host");
  if (existing) {
    gifHost = existing;
    return gifHost;
  }

  const host = document.createElement("div");
  host.id = "pvz-gif-host";
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "1px",
    height: "1px",
    opacity: "0.01",
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: "0",
  });
  if (document.body) {
    document.body.appendChild(host);
  } else {
    window.addEventListener(
      "DOMContentLoaded",
      () => {
        if (!host.isConnected) document.body.appendChild(host);
      },
      { once: true }
    );
  }
  gifHost = host;
  return gifHost;
}

function keepGifAnimating(img, url) {
  if (!/\.gif($|\?)/i.test(url)) return;
  const host = ensureGifHost();
  if (!host || img.dataset.gifHosted === "1") return;
  img.style.width = "1px";
  img.style.height = "1px";
  img.style.objectFit = "contain";
  img.dataset.gifHosted = "1";
  host.appendChild(img);
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      keepGifAnimating(img, url);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function resolveUrl(path) {
  return new URL(path, import.meta.url).toString();
}

export function getAssetUrls() {
  const base = "../../assets/images/pvc-images/images";
  return {
    background: resolveUrl(`${base}/Background.jpg`),
    shop: resolveUrl(`${base}/Shop.png`),
    card: resolveUrl(`${base}/Card.png`),
    sun: resolveUrl(`${base}/Sun.gif`),
    shovel: resolveUrl(`${base}/Shovel.png`),
    mower: resolveUrl(`${base}/LawnMower.png`),
    zombiesWon: resolveUrl(`${base}/ZombiesWon.png`),
    pea: resolveUrl(`${base}/Pea.png`),
    plants: {
      sunflower: resolveUrl(`${base}/SunFlower.gif`),
      peashooter: resolveUrl(`${base}/Peashooter.gif`),
      wallnut: resolveUrl(`${base}/WallNut.gif`),
      wallnutCracked1: resolveUrl(`${base}/WallNut1.gif`),
      wallnutCracked2: resolveUrl(`${base}/WallNut2.gif`),
      cherrybomb: resolveUrl(`${base}/CherryBomb.gif`),
      potatomine: resolveUrl(`${base}/PotatoMine.gif`),
      potatomineUnarmed: resolveUrl(`${base}/PotatoMine1.gif`),
      potatomineBomb: resolveUrl(`${base}/PotatoMineBomb.gif`),
    },
    zombies: {
      normalWalk: resolveUrl(`${base}/ZombieWalk1.gif`),
      normalWalkAlt: resolveUrl(`${base}/ZombieWalk2.gif`),
      normalAttack: resolveUrl(`${base}/ZombieAttack.gif`),
      normalDie: resolveUrl(`${base}/ZombieDie.gif`),
      coneWalk: resolveUrl(`${base}/ConeZombieWalk.gif`),
      coneAttack: resolveUrl(`${base}/ConeZombieAttack.gif`),
      flagWalk: resolveUrl(`${base}/ZombieWalk2.gif`),
    },
    music: resolveUrl("../../assets/audio/Grazy Dave.mp3"),
  };
}

export async function loadAssets() {
  const urls = getAssetUrls();
  const entries = [
    ["background", urls.background],
    ["shop", urls.shop],
    ["card", urls.card],
    ["sun", urls.sun],
    ["shovel", urls.shovel],
    ["mower", urls.mower],
    ["zombiesWon", urls.zombiesWon],
    ["pea", urls.pea],
    ["plantSunflower", urls.plants.sunflower],
    ["plantPeashooter", urls.plants.peashooter],
    ["plantWallnut", urls.plants.wallnut],
    ["plantWallnutCracked1", urls.plants.wallnutCracked1],
    ["plantWallnutCracked2", urls.plants.wallnutCracked2],
    ["plantCherrybomb", urls.plants.cherrybomb],
    ["plantPotatomine", urls.plants.potatomine],
    ["plantPotatomineUnarmed", urls.plants.potatomineUnarmed],
    ["plantPotatomineBomb", urls.plants.potatomineBomb],
    ["zNormalWalk", urls.zombies.normalWalk],
    ["zNormalWalkAlt", urls.zombies.normalWalkAlt],
    ["zNormalAttack", urls.zombies.normalAttack],
    ["zNormalDie", urls.zombies.normalDie],
    ["zConeWalk", urls.zombies.coneWalk],
    ["zConeAttack", urls.zombies.coneAttack],
    ["zFlagWalk", urls.zombies.flagWalk],
  ];
  const loaded = await Promise.all(entries.map(([, url]) => loadImage(url)));
  const images = {};
  entries.forEach(([key], index) => {
    images[key] = loaded[index];
  });
  return {
    urls,
    images,
  };
}
