// Catalog data shared by seed.ts and scripts/fetch-product-images.ts
// biome-ignore-all lint: catalog data

export type OptionDef = {
  name: string;
  values: string[];
};

export type ProductDef = {
  name: string;
  description: string;
  basePrice: number; // approximate market price, used to derive SKU pricing
  options: OptionDef[];
};

export type CategoryDef = {
  name: string;
  description: string;
  products: ProductDef[];
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const CATEGORIES: CategoryDef[] = [
  {
    name: "Mobile Phones",
    description: "Smartphones from leading brands with the latest features.",
    products: [
      {
        name: "iPhone 15",
        description:
          "Apple's flagship smartphone powered by the A16 Bionic chip, with a dual-camera system that shines in low light. The Super Retina XDR display is bright, sharp and easy on the eyes. Backed by iOS updates for years, it's a phone you can keep using long after the novelty wears off.",
        basePrice: 79900,
        options: [
          { name: "Color", values: ["Black", "Blue"] },
          { name: "Storage", values: ["128GB", "256GB"] },
        ],
      },
      {
        name: "iPhone 15 Pro",
        description:
          "The Pro model gets a lightweight titanium build and the A17 Pro chip for console-quality gaming on a phone. Its pro-grade camera system includes a 3x telephoto lens and next-generation portrait controls. Built for people who want the fastest iPhone Apple makes.",
        basePrice: 134900,
        options: [
          { name: "Color", values: ["Black", "Blue"] },
          { name: "Storage", values: ["128GB", "256GB"] },
        ],
      },
      {
        name: "Samsung Galaxy S24",
        description:
          "Samsung's flagship Android phone with a vivid AMOLED display and an AI-powered camera that handles tricky lighting with ease. Galaxy AI assists with translation, photo editing and everyday searches. Premium performance wrapped in a sleek, durable frame.",
        basePrice: 74999,
        options: [
          { name: "Color", values: ["Black", "Blue"] },
          { name: "Storage", values: ["128GB", "256GB"] },
        ],
      },
      {
        name: "Samsung Galaxy A54",
        description:
          "A well-rounded mid-range phone with a 120Hz Super AMOLED display that looks far more expensive than it is. The 50MP camera with optical image stabilization captures steady shots day or night. All-day battery life makes it a dependable daily driver.",
        basePrice: 34999,
        options: [
          { name: "Color", values: ["Black", "Blue"] },
          { name: "Storage", values: ["128GB", "256GB"] },
        ],
      },
      {
        name: "OnePlus 12",
        description:
          "A performance-focused flagship built around the Snapdragon 8 Gen 3 and blisteringly fast wired charging. The curved AMOLED display runs at 120Hz for silky-smooth scrolling and gaming. OxygenOS keeps the software clean and responsive.",
        basePrice: 64999,
        options: [
          { name: "Color", values: ["Black", "Blue"] },
          { name: "Storage", values: ["128GB", "256GB"] },
        ],
      },
      {
        name: "Xiaomi Redmi Note 13",
        description:
          "The go-to pick for buyers who want maximum features on a modest budget. It packs a large AMOLED display, a capable multi-camera setup and a battery that comfortably lasts a full day. Great value for students and first-time smartphone buyers.",
        basePrice: 17999,
        options: [
          { name: "Color", values: ["Black", "Blue"] },
          { name: "Storage", values: ["128GB", "256GB"] },
        ],
      },
      {
        name: "Google Pixel 8",
        description:
          "Google's clean-Android experience powered by the Tensor G3 chip and class-leading computational photography. Photos come out natural and detailed, even in portrait mode and at night. Guaranteed software and security updates directly from Google.",
        basePrice: 75999,
        options: [
          { name: "Color", values: ["Black", "Blue"] },
          { name: "Storage", values: ["128GB", "256GB"] },
        ],
      },
    ],
  },
  {
    name: "Televisions",
    description: "Smart TVs with 4K, QLED and OLED display technology.",
    products: [
      {
        name: "Samsung 55-inch 4K QLED Smart TV",
        description:
          "A 55-inch QLED panel that uses quantum dots to deliver vivid, true-to-life colour even in bright rooms. 4K resolution plus HDR brings movies and sports to life, while the built-in smart platform streams all your apps without a set-top box. A great centrepiece for the living room.",
        basePrice: 62999,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "LG 65-inch OLED Smart TV",
        description:
          "Self-lit OLED pixels switch off completely for perfect blacks and infinite contrast — ideal for movie nights. The 65-inch screen with wide viewing angles looks great from anywhere on the couch. Dolby Vision and Dolby Atmos complete the cinematic experience.",
        basePrice: 154999,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "Sony 50-inch 4K Smart TV",
        description:
          "Sony's picture processor upscales ordinary content to crisp, detailed 4K in real time. The 50-inch 4K panel colours skin tones naturally and keeps fast action smooth. Slim styling with a minimal stand that fits most TV units.",
        basePrice: 54999,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "TCL 43-inch Smart TV",
        description:
          "An affordable smart TV with built-in streaming apps, so you can cut the cable subscription without overspending. The 43-inch full-HD panel is a sensible size for bedrooms and compact living spaces. Simple setup and a straightforward remote keep things easy.",
        basePrice: 21999,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "Mi 55-inch 4K TV",
        description:
          "Xiaomi's value-for-money 4K TV pairs a crisp 55-inch panel with the PatchWall interface that recommends content across apps. Dolby Vision support and a smooth 60Hz display make binge-watching a pleasure. Punches well above its price for families on a budget.",
        basePrice: 39999,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "Panasonic 32-inch HD TV",
        description:
          "A compact HD-ready TV that's easy on the wallet and easy to place. The 32-inch screen is ideal for bedrooms, kitchens and hostels. Low power consumption keeps running costs down.",
        basePrice: 13999,
        options: [{ name: "Color", values: ["Black"] }],
      },
    ],
  },
  {
    name: "Refrigerators",
    description: "Single-door, double-door and side-by-side refrigerators.",
    products: [
      {
        name: "LG 260L Double Door Refrigerator",
        description:
          "A frost-free double door fridge with a smart inverter compressor that runs quietly and saves electricity. The 260L capacity suits a small family, with toughened glass shelves that hold heavy pots with ease. Moist Balance crisper keeps vegetables fresh longer.",
        basePrice: 27999,
        options: [{ name: "Color", values: ["Silver", "Black"] }],
      },
      {
        name: "Samsung 340L Frost Free Refrigerator",
        description:
          "Spacious 340L storage with digital inverter technology that adjusts cooling to what's inside. Frost-free operation means no manual defrosting, ever. A good fit for medium-sized families that stock up on groceries.",
        basePrice: 34999,
        options: [{ name: "Color", values: ["Silver", "Black"] }],
      },
      {
        name: "Whirlpool 190L Single Door Refrigerator",
        description:
          "A compact single-door fridge that fits neatly into small kitchens and studio flats. 6th Sense technology maintains steady cooling even during power cuts. Efficient enough for small households and couples.",
        basePrice: 15999,
        options: [{ name: "Color", values: ["Silver", "Black"] }],
      },
      {
        name: "Haier 450L Side by Side Refrigerator",
        description:
          "A generous 450L side-by-side fridge with twin inverter cooling that keeps fridge and freezer independently precise. The wide layout makes organising large weekly shops simple. A premium look for a modern kitchen.",
        basePrice: 62999,
        options: [{ name: "Color", values: ["Silver", "Black"] }],
      },
      {
        name: "Godrej 236L Double Door Refrigerator",
        description:
          "An energy-efficient double door refrigerator with toughened glass shelves and a large vegetable basket. Designed to deliver dependable cooling while keeping the electricity bill in check. A trusted choice from a household Indian brand.",
        basePrice: 23999,
        options: [{ name: "Color", values: ["Silver", "Black"] }],
      },
      {
        name: "Bosch 300L French Door Refrigerator",
        description:
          "A premium French-door fridge with precise multi-zone cooling so each compartment gets its own temperature. The wide fridge section on top makes plating and storing large trays effortless. German engineering with a refined stainless finish.",
        basePrice: 68999,
        options: [{ name: "Color", values: ["Silver", "Black"] }],
      },
    ],
  },
  {
    name: "Washing Machines",
    description: "Front load, top load and semi-automatic washing machines.",
    products: [
      {
        name: "LG 7kg Front Load Washing Machine",
        description:
          "A 7kg front loader with AI Direct Drive that detects fabric type and adjusts the drum motion to protect clothes. Steam wash sanitises laundry without harsh chemicals. Quiet, efficient and gentle on delicates.",
        basePrice: 32999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Samsung 8kg Front Load Washing Machine",
        description:
          "EcoBubble technology mixes detergent with air and water so it penetrates fabric even at low temperatures. The 8kg drum handles a full family load in one go. Great at removing everyday stains while saving on heating costs.",
        basePrice: 36999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "IFB 6.5kg Fully Automatic Washing Machine",
        description:
          "A fully automatic front-load washer with a wide range of wash programs for cottons, silks and everyday wear. Aquaeater and crescent drum patterns reduce wear on clothes. Solid performance at a sensible mid-range price.",
        basePrice: 26999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Whirlpool 7.5kg Top Load Washing Machine",
        description:
          "A 7.5kg top-load washer with 6th Sense technology that senses the load and adjusts water and wash time automatically. The high-speed spin leaves clothes nearly dry. Easy on the back — no bending to load laundry.",
        basePrice: 18999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Bosch 8kg Front Load Washing Machine",
        description:
          "German-engineered front loader with anti-vibration side panels that keep noise and movement to a minimum. The 8kg capacity and multiple programs cover everything from daily wear to bulky bedding. Built to run for years of daily use.",
        basePrice: 39999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Haier 6kg Semi Automatic Washing Machine",
        description:
          "A budget-friendly semi-automatic twin-tub washer where you control wash and spin separately. Separate wash and spin tubs let you soak while loading the next batch. A practical, low-cost option for smaller households.",
        basePrice: 11999,
        options: [{ name: "Color", values: ["White"] }],
      },
    ],
  },
  {
    name: "Ovens & Microwaves",
    description: "Convection microwaves, grill microwaves and OTGs.",
    products: [
      {
        name: "LG 28L Convection Microwave Oven",
        description:
          "A 28L convection microwave that microwaves, grills and bakes — effectively three appliances in one. Auto cook menus take the guesswork out of everyday recipes, and the diet fry function uses minimal oil. Roomy enough for a full chicken or a cake tin.",
        basePrice: 13999,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "Samsung 23L Solo Microwave Oven",
        description:
          "A compact solo microwave that excels at reheating, defrosting and simple cooking. The 23L capacity suits singles, students and small families. Straightforward dial controls that anyone can use on day one.",
        basePrice: 7999,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "IFB 20L Grill Microwave Oven",
        description:
          "A grill microwave with a quartz heater that gives snacks a proper crispy, browned finish. The 20L capacity covers everyday reheating and grilling needs. A step up from a solo microwave without the convection price tag.",
        basePrice: 9499,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "Bajaj Majesty Oven Toaster Griller",
        description:
          "A compact OTG for baking, toasting and grilling — perfect for cookies, sandwiches and small batches of pizza. Adjustable temperature and timer give you full control. An affordable entry into countertop baking.",
        basePrice: 5499,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "Morphy Richards 40L OTG",
        description:
          "A large 40L OTG with enough room for cakes, roasts and a full tray of pastries. Separate heating elements on top and bottom give even browning. A good pick for serious home bakers and large families.",
        basePrice: 8999,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "Panasonic 27L Convection Microwave",
        description:
          "A 27L convection microwave with turbo defrost that thaws food evenly in minutes. Pre-set menus cover common dishes with a single button press. Reliable Panasonic build quality with a clean, modern look.",
        basePrice: 12499,
        options: [{ name: "Color", values: ["Black"] }],
      },
    ],
  },
  {
    name: "Mixers & Grinders",
    description: "Mixer grinders and juicers for everyday kitchen use.",
    products: [
      {
        name: "Preethi Zodiac Mixer Grinder",
        description:
          "A powerful 750W mixer grinder that comes with five jars, including a chutney jar and a juicer. Turbo motor technology handles tough batters and masalas without straining. One of the most popular all-rounders in Indian kitchens.",
        basePrice: 6499,
        options: [{ name: "Color", values: ["Red", "White"] }],
      },
      {
        name: "Bajaj Rex Mixer Grinder",
        description:
          "A no-nonsense 500W mixer grinder with three stainless steel jars for daily grinding tasks. Lightweight, easy to clean and simple to operate. A reliable budget pick for small families.",
        basePrice: 2799,
        options: [{ name: "Color", values: ["Red", "White"] }],
      },
      {
        name: "Philips HL7756 Mixer Grinder",
        description:
          "A 750W mixer grinder with advanced Aer Shield technology that keeps the motor cooler during long grinding sessions. The air-vented jars prevent spills while blending. Known for quiet, consistent performance.",
        basePrice: 4999,
        options: [{ name: "Color", values: ["Red", "White"] }],
      },
      {
        name: "Butterfly Matchless Mixer Grinder",
        description:
          "A powerful mixer grinder with a smart vent design that dissipates heat for longer motor life. Comes with durable stainless steel jars and secure lids. A strong performer for everyday masala and batter grinding.",
        basePrice: 3499,
        options: [{ name: "Color", values: ["Red", "White"] }],
      },
      {
        name: "Sujata Dynamix Mixer Grinder",
        description:
          "A heavy-duty 900W mixer grinder built for continuous daily use, even in busy households. Three-speed control with a whip function handles everything from chutneys to smoothies. Widely regarded as a workhorse that simply keeps going.",
        basePrice: 4299,
        options: [{ name: "Color", values: ["Red", "White"] }],
      },
      {
        name: "Maharaja Whiteline Mixer Grinder",
        description:
          "A compact mixer grinder with overload protection that cuts power if the motor is strained. Three jars cover grinding, blending and juicing basics. A space-saving, budget-friendly choice for small kitchens.",
        basePrice: 2499,
        options: [{ name: "Color", values: ["Red", "White"] }],
      },
    ],
  },
  {
    name: "Laptops",
    description: "Laptops for work, study and everyday computing.",
    products: [
      {
        name: "MacBook Air M2",
        description:
          "An ultra-thin laptop built around the efficient Apple M2 chip, so it runs silently with no fan noise. The battery easily lasts a full workday, and the Liquid Retina display is bright and colour-accurate. Feather-light to carry and a joy for writing, study and everyday work.",
        basePrice: 114900,
        options: [
          { name: "Color", values: ["Silver"] },
          { name: "RAM", values: ["8GB", "16GB"] },
        ],
      },
      {
        name: "Dell XPS 13",
        description:
          "A premium ultrabook with an InfinityEdge display that squeezes a big screen into a tiny chassis. Sharp keyboard, precise trackpad and a machined aluminium body that feels built to last. Ideal for professionals who travel light.",
        basePrice: 94999,
        options: [
          { name: "Color", values: ["Silver"] },
          { name: "RAM", values: ["8GB", "16GB"] },
        ],
      },
      {
        name: "HP Pavilion 15",
        description:
          "An everyday laptop with a bright 15-inch display and reliable performance for study, office work and streaming. Comfortable full-size keyboard and plenty of ports for accessories. A dependable all-rounder at a mid-range price.",
        basePrice: 54999,
        options: [
          { name: "Color", values: ["Silver"] },
          { name: "RAM", values: ["8GB", "16GB"] },
        ],
      },
      {
        name: "Lenovo ThinkPad E14",
        description:
          "A business laptop with the legendary ThinkPad keyboard and a durable chassis that survives daily commuting. Security features and solid build quality make it a favourite for office fleets. Fast, no-nonsense performance for documents and multitasking.",
        basePrice: 59999,
        options: [
          { name: "Color", values: ["Silver"] },
          { name: "RAM", values: ["8GB", "16GB"] },
        ],
      },
      {
        name: "ASUS VivoBook 15",
        description:
          "A value-for-money laptop with a full-size number pad — handy for students and accountants alike. Slim, light and available in fun colours. Handles everyday multitasking, homework and streaming with ease.",
        basePrice: 44999,
        options: [
          { name: "Color", values: ["Silver"] },
          { name: "RAM", values: ["8GB", "16GB"] },
        ],
      },
      {
        name: "Acer Aspire 7",
        description:
          "A mid-range laptop with dedicated graphics that can handle light gaming and photo editing alongside everyday work. The sturdy chassis and decent cooling keep performance steady. Great bang-for-buck for first-time gamers.",
        basePrice: 52999,
        options: [
          { name: "Color", values: ["Silver"] },
          { name: "RAM", values: ["8GB", "16GB"] },
        ],
      },
      {
        name: "MSI Modern 14",
        description:
          "A slim and light 14-inch laptop designed for productivity on the go. The compact body slips into any bag while still packing a comfortable keyboard and crisp display. A smart pick for students and frequent travellers.",
        basePrice: 49999,
        options: [
          { name: "Color", values: ["Silver"] },
          { name: "RAM", values: ["8GB", "16GB"] },
        ],
      },
    ],
  },
  {
    name: "Air Conditioners",
    description: "Split and window ACs with inverter technology.",
    products: [
      {
        name: "LG 1.5 Ton Split AC",
        description:
          "A 1.5 ton inverter split AC with dual-cool modes that heat as well as cool — useful through Nepali winters. Convertible tonnage lets you dial capacity down when the room is only half full. Fast cooling with quietly efficient operation.",
        basePrice: 37999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Voltas 1 Ton Window AC",
        description:
          "A reliable 1 ton window AC with a high-density anti-corrosive coating that stands up to humid weather. Straightforward installation in a standard window cutout. A budget-conscious way to cool a single bedroom.",
        basePrice: 26999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Daikin 1.5 Ton Inverter AC",
        description:
          "An energy-efficient inverter AC with coanda airflow that circulates air evenly instead of blowing directly at you. Japanese engineering known for quiet, dependable cooling. A great long-term pick for continuous daily use.",
        basePrice: 43999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Samsung 2 Ton Split AC",
        description:
          "A powerful 2 ton split AC with WindFree cooling that disperses air through thousands of micro holes — no harsh direct breeze. Ideal for larger living rooms that need serious cooling capacity. Smart features let you control it from your phone.",
        basePrice: 52999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Blue Star 1.5 Ton AC",
        description:
          "A 1.5 ton split AC with turbo cool for quick relief on the hottest afternoons. Built-in dust filtration keeps the air you breathe cleaner. Solid cooling performance from a trusted Indian AC brand.",
        basePrice: 39999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Hitachi 1 Ton Split AC",
        description:
          "A compact 1 ton split AC that's just right for small to medium bedrooms. Steady, efficient cooling with a clean indoor unit design. A dependable choice from one of the most established names in cooling.",
        basePrice: 31999,
        options: [{ name: "Color", values: ["White"] }],
      },
    ],
  },
  {
    name: "Headphones & Earphones",
    description: "Wired and wireless headphones, earbuds and neckbands.",
    products: [
      {
        name: "Sony WH-1000XM5",
        description:
          "Industry-leading noise cancelling that hushes plane engines, office chatter and street noise. Crystal-clear call quality and up to 30 hours of battery life for long-haul travel. Plush, comfortable earcups you can wear for hours.",
        basePrice: 29990,
        options: [{ name: "Color", values: ["Black", "White", "Blue"] }],
      },
      {
        name: "boAt Rockerz 450",
        description:
          "Wireless on-ear headphones with up to 15 hours of playback on a single charge. Padded earcups and a lightweight frame keep them comfortable during commutes. An unbeatable price for everyday wireless listening.",
        basePrice: 1499,
        options: [{ name: "Color", values: ["Black", "White", "Blue"] }],
      },
      {
        name: "JBL Tune 760NC",
        description:
          "Noise-cancelling wireless headphones with the punchy JBL bass signature music fans love. Multi-point connection lets you switch between laptop and phone seamlessly. Foldable design with up to 50 hours of battery.",
        basePrice: 4999,
        options: [{ name: "Color", values: ["Black", "White", "Blue"] }],
      },
      {
        name: "Apple AirPods Pro",
        description:
          "True wireless earbuds with adaptive active noise cancellation that adjusts to your surroundings. Spatial audio makes films and music feel immersive, and the transparency mode lets you hear traffic safely. Seamless pairing across iPhone, iPad and Mac.",
        basePrice: 24900,
        options: [{ name: "Color", values: ["Black", "White", "Blue"] }],
      },
      {
        name: "Samsung Galaxy Buds2",
        description:
          "Compact true wireless earbuds with ANC that block out background hum on commutes and flights. Rich, balanced sound with a comfortable fit that stays put while walking. Wireless charging case tops them up on the go.",
        basePrice: 9999,
        options: [{ name: "Color", values: ["Black", "White", "Blue"] }],
      },
      {
        name: "Sennheiser HD 450BT",
        description:
          "Wireless over-ear headphones tuned by Sennheiser for a balanced, detailed sound signature. Active noise cancellation and aptX support suit commuters and podcast lovers alike. Solid 30-hour battery with quick charge.",
        basePrice: 8999,
        options: [{ name: "Color", values: ["Black", "White", "Blue"] }],
      },
    ],
  },
  {
    name: "Speakers",
    description: "Portable Bluetooth speakers and smart speakers.",
    products: [
      {
        name: "JBL Flip 6",
        description:
          "A portable waterproof Bluetooth speaker with punchy bass that fills a room or a campsite. The rugged, floatable design survives rain, sand and poolside splashes. 12 hours of playtime in a cylindrical body that clips to a backpack.",
        basePrice: 9999,
        options: [{ name: "Color", values: ["Black", "Blue"] }],
      },
      {
        name: "Sony SRS-XB13",
        description:
          "A compact, party-proof speaker with Extra Bass that belies its tiny size. IP67 waterproof and dustproof, so it goes anywhere without worry. Up to 16 hours of battery in a palm-sized package.",
        basePrice: 2999,
        options: [{ name: "Color", values: ["Black", "Blue"] }],
      },
      {
        name: "boAt Stone 1200",
        description:
          "A rugged Bluetooth speaker with RGB lighting effects that set the mood at gatherings. Loud, bass-heavy output with a shockproof body built for the outdoors. Long battery life at an easy price.",
        basePrice: 2499,
        options: [{ name: "Color", values: ["Black", "Blue"] }],
      },
      {
        name: "Marshall Emberton",
        description:
          "Iconic amplifier-styled portable speaker with rich, detailed, room-filling sound. True wireless stereo lets you pair two for a wider stage. Premium build with a signature Marshall grille that looks as good as it sounds.",
        basePrice: 12999,
        options: [{ name: "Color", values: ["Black", "Blue"] }],
      },
      {
        name: "Amazon Echo Dot",
        description:
          "A smart speaker with Alexa built in — ask for music, weather, timers and smart-home control by voice. Compact size that fits on a bedside table or kitchen shelf. A simple entry point into a hands-free smart home.",
        basePrice: 4499,
        options: [{ name: "Color", values: ["Black", "Blue"] }],
      },
    ],
  },
];
