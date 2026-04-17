const fs = require('fs');
const path = require('path');
const https = require('https');

const dir = path.join(__dirname, 'public', 'images', 'avatars');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const players = [
  { name: 'mbappe', url: 'https://a.espncdn.com/combiner/i?img=/i/headshots/soccer/players/full/228604.png&h=200&w=200' },
  { name: 'messi', url: 'https://a.espncdn.com/combiner/i?img=/i/headshots/soccer/players/full/45843.png&h=200&w=200' },
  { name: 'alvarez', url: 'https://a.espncdn.com/combiner/i?img=/i/headshots/soccer/players/full/284042.png&h=200&w=200' },
  { name: 'giroud', url: 'https://a.espncdn.com/combiner/i?img=/i/headshots/soccer/players/full/104669.png&h=200&w=200' },
  { name: 'saka', url: 'https://a.espncdn.com/combiner/i?img=/i/headshots/soccer/players/full/264226.png&h=200&w=200' }
];

players.forEach(p => {
  const file = fs.createWriteStream(path.join(dir, `${p.name}.png`));
  https.get(p.url, response => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${p.name}.png`);
    });
  }).on('error', err => {
    fs.unlink(path.join(dir, `${p.name}.png`), () => { });
    console.error(`Error downloading ${p.name}: ${err.message}`);
  });
});
