import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const movies = [
    { tmdbId: 157336, title: "Interstellar", overview: "A team travels through a wormhole in space." },
    { tmdbId: 27205, title: "Inception", overview: "A thief enters dreams to plant an idea." },
    { tmdbId: 155, title: "The Dark Knight", overview: "Batman faces the Joker in Gotham." },
  ];

  for (const m of movies) {
    await prisma.cachedMovie.upsert({
      where: { tmdbId: m.tmdbId },
      update: {
        title: m.title,
        overview: m.overview,
        genresJson: [],
      },
      create: {
        tmdbId: m.tmdbId,
        title: m.title,
        overview: m.overview,
        genresJson: [],
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
