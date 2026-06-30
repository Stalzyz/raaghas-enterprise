import { PrismaClient } from '@raaghas/database';

const prisma = new PrismaClient();

async function main() {
  const luxuryHomeSections = [
    {
      id: "hero-1",
      type: "HERO",
      order: 0,
      content: {
        variant: "aesthetic",
        headline: "Luxury\\nMeets Modern.",
        description: "RAAGHAS CURATED 2026",
        subheadline: "Hand-crafted silks and intricate Kalamkari motifs reimagined for the contemporary woman.",
        image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=1200",
        primaryCta: { text: "Discover Collection", link: "/collections/silk" },
        fabrics: [
          { x: 30, y: 40, scale: 1.2, opacity: 0.1, speed: 1.2, rotation: 45 },
          { x: 70, y: 60, scale: 1.5, opacity: 0.08, speed: 0.8, rotation: -30 }
        ],
        uiElements: [
          { iconName: "LuxuryHanger", x: 15, y: 25, size: 1.2, opacity: 0.2, speed: 1.5 },
          { iconName: "KalamkariFlower", x: 80, y: 40, size: 2, opacity: 0.15, speed: 1.2 },
          { iconName: "PremiumCart", x: 10, y: 70, size: 1, opacity: 0.2, speed: 1.8 },
          { iconName: "SilkSpool", x: 90, y: 20, size: 1.5, opacity: 0.1, speed: 1 }
        ]
      },
      style: {
        textAlign: "left",
        backgroundColor: "#F8F5F2",
        textColor: "#1A1A1A",
        layout: "standard",
        texture: "grain"
      },
      settings: {
        animation: "fade",
        speed: 1.2,
        parallax: true
      }
    },
    {
      id: "trust-1",
      type: "TRUST_BAR",
      order: 1,
      content: {
        items: [
          { icon: "Truck", text: "Global Express Delivery" },
          { icon: "Shield", text: "Luxury Packaging Included" },
          { icon: "RotateCcw", text: "7-Day Signature Returns" }
        ]
      },
      style: {
        layout: "glass",
        backgroundColor: "#ffffff",
        paddingTop: 40,
        paddingBottom: 40
      },
      settings: {
        animation: "slide-up",
        speed: 0.8
      }
    },
    {
      id: "category-1",
      type: "CATEGORY_STRIP",
      order: 2,
      content: {
        categories: [
          { label: "Hand-painted Kalamkari", link: "/collections/kalamkari", image: "https://images.unsplash.com/photo-1610030469983-98e550d615e1?w=400" },
          { label: "Pure Dupion Silks", link: "/collections/silk", image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400" },
          { label: "Signature Sets", link: "/collections/sets", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400" }
        ]
      },
      style: {
        layout: "glass",
        texture: "grain",
        paddingTop: 80,
        paddingBottom: 80
      }
    }
  ] as any[];

  await prisma.page.upsert({
    where: { handle: 'home' },
    update: {
      sections: {
        deleteMany: {},
        create: luxuryHomeSections
      }
    },
    create: {
      title: 'Home',
      handle: 'home',
      sections: {
        create: luxuryHomeSections
      }
    }
  });

  console.log('Luxury Home Seeding Complete! 💎');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
