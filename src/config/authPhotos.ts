import type { AuthPhoto } from '@/interfaces/AuthPhoto'

// Placeholder badminton photos, loaded from Wikimedia Commons by link (not
// bundled). Their licences require the credit shown on each page. The host
// must stay allowed in img-src: docker/proxy/nginx.conf and src-tauri/tauri.conf.json.
const thumb = (path: string, name: string) => `https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}/${name}/1920px-${name}`

const foubister = {
  author: 'Murray Foubister',
  license: 'CC BY-SA 2.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
}

export const authPhotos = {
  signIn: {
    src: thumb('8/88', '2014_US_Open_Grand_Prix_Gold_-_Men%27s_doubles_final_match_1.jpg'),
    alt: "Men's doubles final at the 2014 US Open badminton championships",
    focus: '35% 50%',
    credit: {
      ...foubister,
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:2014_US_Open_Grand_Prix_Gold_-_Men%27s_doubles_final_match_1.jpg',
    },
  },
  signUp: {
    src: thumb('4/46', '2014_US_Open_Grand_Prix_Gold_-_Mixed_doubles_final_match.jpg'),
    alt: 'Mixed doubles final at the 2014 US Open badminton championships',
    focus: '35% 55%',
    credit: {
      ...foubister,
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:2014_US_Open_Grand_Prix_Gold_-_Mixed_doubles_final_match.jpg',
    },
  },
  recovery: {
    src: thumb('a/ad', 'Rachet%C4%83_de_badminton_%C5%9Fi_flutura%C5%9F.jpg'),
    alt: 'A badminton racket with a shuttlecock resting on its strings',
    focus: '40% 50%',
    credit: {
      author: 'Vladimir Maftei',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Rachet%C4%83_de_badminton_%C5%9Fi_flutura%C5%9F.jpg',
    },
  },
} satisfies Record<string, AuthPhoto>
