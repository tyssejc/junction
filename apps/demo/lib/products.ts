export interface ProductVariant {
  label: string;
  options: string[];
}

export interface Product {
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  image: string;
  variants?: ProductVariant[];
  badge?: string;
}

export const products: Product[] = [
  {
    slug: "apollo-11-mission-tee",
    name: "Apollo 11 Mission Tee",
    description:
      "Wear history. This premium cotton tee features the iconic Apollo 11 mission patch — a reminder that humans once left footprints on the Moon.",
    price: 34.99,
    currency: "USD",
    category: "apparel",
    image: "/products/apollo-tee.jpg",
    variants: [{ label: "Size", options: ["S", "M", "L", "XL"] }],
    badge: "Bestseller",
  },
  {
    slug: "saturn-v-model-rocket-kit",
    name: "Saturn V Model Rocket Kit",
    description:
      "Build the most powerful rocket ever flown. This detailed model kit captures every stage of the Saturn V that carried astronauts to the Moon.",
    price: 89.99,
    currency: "USD",
    category: "models",
    image: "/products/saturn-v-kit.jpg",
    variants: [{ label: "Scale", options: ["1:100", "1:200"] }],
  },
  {
    slug: "artemis-i-mission-patch",
    name: "Artemis I Mission Patch",
    description:
      "Embroidered mission patch commemorating Artemis I — the first integrated test of NASA's next-generation deep space exploration systems.",
    price: 12.99,
    currency: "USD",
    category: "patches",
    image: "/products/artemis-patch.jpg",
  },
  {
    slug: "spacex-starship-sticker-pack",
    name: "SpaceX Starship Sticker Pack",
    description:
      "Eight premium vinyl stickers celebrating every milestone of Starship development. Weatherproof and built to last as long as the spacecraft they depict.",
    price: 8.99,
    currency: "USD",
    category: "stickers",
    image: "/products/starship-stickers.jpg",
  },
  {
    slug: "the-right-stuff",
    name: "The Right Stuff - Tom Wolfe",
    description:
      "Tom Wolfe's electrifying account of the original Mercury astronauts. The definitive story of what it takes to strap into a rocket and go.",
    price: 16.99,
    currency: "USD",
    category: "books",
    image: "/products/right-stuff-book.jpg",
  },
  {
    slug: "mars-rover-blueprint-poster",
    name: "Mars Rover Blueprint Poster",
    description:
      "A stunning technical blueprint poster of the Mars Perseverance Rover. Printed on heavyweight matte paper with precise engineering detail.",
    price: 24.99,
    currency: "USD",
    category: "posters",
    image: "/products/mars-rover-poster.jpg",
  },
  {
    slug: "iss-crew-jacket",
    name: "ISS Crew Jacket",
    description:
      "The jacket worn by ISS crews during off-duty hours. Water-resistant shell, fleece lining, and the ISS mission patch embroidered on the chest.",
    price: 129.99,
    currency: "USD",
    category: "apparel",
    image: "/products/iss-jacket.jpg",
    variants: [{ label: "Size", options: ["S", "M", "L", "XL", "XXL"] }],
    badge: "New",
  },
  {
    slug: "voyager-golden-record-vinyl",
    name: "Voyager Golden Record Vinyl",
    description:
      "A faithful reproduction of the Golden Record sent into interstellar space aboard Voyager 1. Includes all 27 tracks selected to represent Earth.",
    price: 49.99,
    currency: "USD",
    category: "collectibles",
    image: "/products/golden-record.jpg",
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter((p) => p.category === category);
}
