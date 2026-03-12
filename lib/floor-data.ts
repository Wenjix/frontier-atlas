export type FloorType = "thematic" | "commons" | "private"

export interface FloorLead {
  id: string
  name: string
  role: string
  avatar: string
  helpsWith: string
}

export interface PersonToKnow {
  id: string
  name: string
  avatar: string
  project: string
  whyNow: string
}

export interface FloorEvent {
  id: string
  title: string
  time: string
  host?: string
  recurring?: boolean
}

export interface PlugInOption {
  id: string
  label: string
  type: "ask" | "cta"
}

export interface HappeningNow {
  signals: string[]
  summary: string
}

export interface Floor {
  id: string
  number: string
  name: string
  icon: string
  type: FloorType
  // Card A: Floor Identity
  description: string
  tags: string[]
  bestFor: string
  character?: string
  // Card B: Happening Now
  happeningNow: HappeningNow
  // Card C: Event Calendar
  events: FloorEvent[]
  // Card D: Floor Leads + People to Know
  leads: FloorLead[]
  peopleToKnow: PersonToKnow[]
  // Card E: Optional Ways to Plug In
  plugIn?: PlugInOption[]
  // For tower spine
  signal?: string
}

export const floors: Floor[] = [
  {
    id: "basement",
    number: "B",
    name: "Event Space",
    icon: "🎪",
    type: "commons",
    description: "The heart of community gatherings. Hosts mixers, talks, and special events.",
    tags: ["events", "networking", "performances"],
    bestFor: "Large gatherings, community events, talks",
    character: "High energy when active, quiet between events. The town square.",
    signal: "Tonight: AI x biotech mixer",
    happeningNow: {
      signals: [
        "Setup in progress for tonight's event",
        "45 RSVPs for AI x Biotech mixer",
        "Sound check at 5pm"
      ],
      summary: "Tonight's mixer will bring together AI and Biotech floors. Expect a full house."
    },
    events: [
      { id: "e1", title: "AI x Biotech Mixer", time: "Tonight, 7pm", host: "Maya Chen" },
      { id: "e2", title: "Founder Fireside", time: "Friday, 6pm", host: "Guest Speaker" },
      { id: "e3", title: "Demo Day", time: "Last Friday of month", recurring: true },
    ],
    leads: [
      { id: "l1", name: "Maya Chen", role: "Events Lead", avatar: "MC", helpsWith: "Event logistics, AV setup, and booking" },
    ],
    peopleToKnow: [
      { id: "p1", name: "Jordan Blake", avatar: "JB", project: "AV and production tech", whyNow: "Running sound tonight" },
    ],
    plugIn: [
      { id: "pi1", label: "Propose an event", type: "cta" },
      { id: "pi2", label: "Volunteer for setup", type: "cta" },
    ],
  },
  {
    id: "floor-1",
    number: "1",
    name: "Lobby",
    icon: "🚪",
    type: "commons",
    description: "Your starting point. Meet the community, find your way, begin your journey.",
    tags: ["onboarding", "introductions", "navigation"],
    bestFor: "New members, first visits, finding your way",
    character: "Welcoming and orienting. The front door.",
    signal: "Start here",
    happeningNow: {
      signals: [
        "8 members in the lobby now",
        "New member orientation at 10am",
        "Concierge available"
      ],
      summary: "Quiet morning. Good time for a tour or to complete your profile."
    },
    events: [
      { id: "e4", title: "New Member Orientation", time: "Daily, 10am", host: "Alex Rivera", recurring: true },
      { id: "e5", title: "Community Welcome", time: "Mondays, 5pm", recurring: true },
    ],
    leads: [
      { id: "l2", name: "Alex Rivera", role: "Community Lead", avatar: "AR", helpsWith: "Onboarding, intros, and general questions" },
      { id: "l3", name: "Sam Park", role: "Concierge", avatar: "SP", helpsWith: "Navigation and wayfinding" },
    ],
    peopleToKnow: [
      { id: "p2", name: "New members this week", avatar: "NM", project: "Just joined", whyNow: "Say hello!" },
    ],
    plugIn: [
      { id: "pi3", label: "Complete your profile", type: "cta" },
      { id: "pi4", label: "Request a tour", type: "cta" },
    ],
  },
  {
    id: "floor-2a",
    number: "2A",
    name: "The Spaceship",
    icon: "🛸",
    type: "thematic",
    description: "Presentation and performance space. Where ideas take off.",
    tags: ["demos", "pitches", "performances"],
    bestFor: "Demo days, pitch practice, presentations",
    character: "Stage-ready. Dramatic lighting, professional AV.",
    signal: "Event setup today",
    happeningNow: {
      signals: [
        "Stage configuration in progress",
        "Demo Day rehearsals tomorrow",
        "2 pitch practice slots open"
      ],
      summary: "Prepping for tomorrow's rehearsal. Book a slot if you need presentation time."
    },
    events: [
      { id: "e6", title: "Demo Day Rehearsal", time: "Tomorrow, 2pm", host: "Luna Vega" },
      { id: "e7", title: "Pitch Practice", time: "Wed & Fri, 4pm", recurring: true },
    ],
    leads: [
      { id: "l4", name: "Luna Vega", role: "Producer", avatar: "LV", helpsWith: "Presentation coaching and stage time" },
      { id: "l5", name: "Kai Mitchell", role: "Technical Director", avatar: "KM", helpsWith: "AV setup and technical needs" },
    ],
    peopleToKnow: [
      { id: "p3", name: "Founders prepping demos", avatar: "FP", project: "Various startups", whyNow: "Open to feedback" },
    ],
    plugIn: [
      { id: "pi5", label: "Book stage time", type: "cta" },
      { id: "pi6", label: "Request presentation coaching", type: "ask" },
    ],
  },
  {
    id: "floor-2b",
    number: "2B",
    name: "Private Offices",
    icon: "🏢",
    type: "private",
    description: "Dedicated workspaces for resident teams. Quiet, focused, productive.",
    tags: ["private", "dedicated", "teams"],
    bestFor: "Resident teams needing dedicated space",
    character: "Focused and professional. Knock before entering.",
    signal: "2 office hours today",
    happeningNow: {
      signals: [
        "Office hours: Elena Torres at 3pm",
        "Office hours: Marcus Webb Thu 2pm",
        "Most teams heads-down"
      ],
      summary: "Quiet work day. Office hours are a good chance to connect with residents."
    },
    events: [
      { id: "e8", title: "Office Hours: Elena Torres", time: "Wed, 3pm", host: "Elena Torres" },
      { id: "e9", title: "Office Hours: Marcus Webb", time: "Thu, 2pm", host: "Marcus Webb" },
    ],
    leads: [
      { id: "l6", name: "Elena Torres", role: "Startup Founder", avatar: "ET", helpsWith: "Fundraising advice, B2B sales" },
      { id: "l7", name: "Marcus Webb", role: "CTO", avatar: "MW", helpsWith: "Engineering architecture, hiring" },
    ],
    peopleToKnow: [
      { id: "p4", name: "Resident teams", avatar: "RT", project: "Various startups", whyNow: "Office hours open" },
    ],
    plugIn: [
      { id: "pi7", label: "Request intro to a resident", type: "cta" },
    ],
  },
  {
    id: "floor-3",
    number: "3",
    name: "Private Offices",
    icon: "🏢",
    type: "private",
    description: "Dedicated workspaces for resident teams. Quiet, focused, productive.",
    tags: ["private", "dedicated", "teams"],
    bestFor: "Resident teams needing dedicated space",
    character: "Focused and professional. Knock before entering.",
    signal: "Heads-down day",
    happeningNow: {
      signals: [
        "Most teams in deep work mode",
        "Office hours: David Kim at 4pm",
        "Quiet afternoon"
      ],
      summary: "Focused work day. Catch David's office hours for startup advice."
    },
    events: [
      { id: "e8b", title: "Office Hours: David Kim", time: "Today, 4pm", host: "David Kim" },
      { id: "e9b", title: "Resident Lunch", time: "Fridays, 12pm", recurring: true },
    ],
    leads: [
      { id: "l6b", name: "David Kim", role: "Serial Founder", avatar: "DK", helpsWith: "Go-to-market, product strategy" },
      { id: "l7b", name: "Sarah Chen", role: "Engineering Lead", avatar: "SC", helpsWith: "Technical hiring, system design" },
    ],
    peopleToKnow: [
      { id: "p4b", name: "Floor 3 residents", avatar: "R3", project: "Various startups", whyNow: "Office hours today" },
    ],
    plugIn: [
      { id: "pi7b", label: "Request intro to a resident", type: "cta" },
    ],
  },
  {
    id: "floor-4",
    number: "4",
    name: "Robotics",
    icon: "🤖",
    type: "thematic",
    description: "Hardware hackers and robotics engineers building the future of automation.",
    tags: ["hardware", "robotics", "automation", "embedded"],
    bestFor: "Technical builders, hardware prototyping, embedded systems",
    character: "Noisy workshop energy. Things being built and tested.",
    signal: "2 new members",
    happeningNow: {
      signals: [
        "2 new members joined this week",
        "Prototype testing in progress",
        "Robot Demo Night next Friday"
      ],
      summary: "Active week with new hardware projects. Good bridge to AI floor for embodied systems."
    },
    events: [
      { id: "e10", title: "Robot Demo Night", time: "Next Friday, 6pm", host: "Yuki Tanaka" },
      { id: "e11", title: "Hardware Office Hours", time: "Tuesdays, 3pm", recurring: true },
    ],
    leads: [
      { id: "l8", name: "Yuki Tanaka", role: "Robotics Engineer", avatar: "YT", helpsWith: "ROS, manipulation, hardware design" },
      { id: "l9", name: "Chris Okonkwo", role: "Hardware Lead", avatar: "CO", helpsWith: "PCB design, embedded systems" },
    ],
    peopleToKnow: [
      { id: "p5", name: "New hardware founders", avatar: "HF", project: "Robotics startups", whyNow: "Just joined, open to connect" },
    ],
    plugIn: [
      { id: "pi8", label: "Looking for mechanical engineers", type: "ask" },
      { id: "pi9", label: "Share a project", type: "cta" },
    ],
  },
  {
    id: "floor-5",
    number: "5",
    name: "Frontier Fitness Center",
    icon: "🏆",
    type: "commons",
    description: "Take a break, move your body, connect with fellow builders.",
    tags: ["wellness", "fitness", "breaks"],
    bestFor: "Movement breaks, wellness, informal connections",
    character: "Energizing but relaxed. Conversation encouraged.",
    signal: "Open coworking",
    happeningNow: {
      signals: [
        "5 people working out",
        "Morning yoga finished",
        "Boxing class tonight"
      ],
      summary: "Good mid-day energy. Quiet place for a break or movement."
    },
    events: [
      { id: "e12", title: "Morning Yoga", time: "Daily, 7am", host: "Jamie Lee", recurring: true },
      { id: "e13", title: "Boxing Class", time: "Tue & Thu, 6pm", host: "Guest Instructor", recurring: true },
    ],
    leads: [
      { id: "l10", name: "Jamie Lee", role: "Wellness Coach", avatar: "JL", helpsWith: "Fitness, nutrition, wellness breaks" },
    ],
    peopleToKnow: [
      { id: "p6", name: "Regular gym crew", avatar: "GC", project: "Daily workout", whyNow: "Good for informal intros" },
    ],
  },
  {
    id: "floor-6",
    number: "6",
    name: "Arts & Music",
    icon: "🎶",
    type: "thematic",
    description: "Creative souls making art, music, and everything in between.",
    tags: ["art", "music", "creative", "production"],
    bestFor: "Artists, musicians, creative collaborations",
    character: "Expressive and inspiring. Jam sessions happen.",
    signal: "Jam session Friday",
    happeningNow: {
      signals: [
        "Recording session in progress",
        "Jam session Friday 8pm",
        "Art show opening next Saturday"
      ],
      summary: "Creative energy this week. Studio bookable, and the Friday jam is open to all."
    },
    events: [
      { id: "e14", title: "Friday Jam Session", time: "Fri, 8pm", host: "Diego Santos" },
      { id: "e15", title: "Art Show Opening", time: "Next Saturday, 7pm", host: "Zara Bloom" },
      { id: "e16", title: "Open Studio", time: "Sundays", recurring: true },
    ],
    leads: [
      { id: "l11", name: "Zara Bloom", role: "Visual Artist", avatar: "ZB", helpsWith: "Digital art, installations, creative direction" },
      { id: "l12", name: "Diego Santos", role: "Musician", avatar: "DS", helpsWith: "Music production, jam sessions" },
    ],
    peopleToKnow: [
      { id: "p7", name: "Artists in residence", avatar: "AI", project: "Various mediums", whyNow: "Preparing for art show" },
    ],
    plugIn: [
      { id: "pi10", label: "Looking for album cover artist", type: "ask" },
      { id: "pi11", label: "Book studio time", type: "cta" },
    ],
  },
  {
    id: "floor-7",
    number: "7",
    name: "Frontier Makerspace",
    icon: "🚀",
    type: "thematic",
    description: "3D printers, laser cutters, and tools for building physical things.",
    tags: ["prototyping", "3D printing", "fabrication"],
    bestFor: "Physical prototyping, fabrication, learning tools",
    character: "Workshop vibes. Helpful and hands-on.",
    signal: "3 open build requests",
    happeningNow: {
      signals: [
        "3D printer running (2hr remaining)",
        "Laser cutter available",
        "Intro workshop Wednesday"
      ],
      summary: "Steady activity. Good day to learn a new tool or get help with a prototype."
    },
    events: [
      { id: "e17", title: "Intro to Laser Cutting", time: "Wed, 4pm", host: "Riley Foster" },
      { id: "e18", title: "Open Build Hours", time: "Weekdays 10-6", recurring: true },
    ],
    leads: [
      { id: "l13", name: "Riley Foster", role: "Maker in Residence", avatar: "RF", helpsWith: "3D printing, CNC, tool training" },
      { id: "l14", name: "Indira Sharma", role: "Industrial Designer", avatar: "IS", helpsWith: "CAD, prototyping, design for manufacturing" },
    ],
    peopleToKnow: [
      { id: "p8", name: "Hardware founders", avatar: "HW", project: "Building prototypes", whyNow: "Often here working" },
    ],
    plugIn: [
      { id: "pi12", label: "Need help with enclosure design", type: "ask" },
      { id: "pi13", label: "Request tool training", type: "cta" },
    ],
  },
  {
    id: "floor-8",
    number: "8",
    name: "Biotech & Neurotech",
    icon: "🧬",
    type: "thematic",
    description: "Founders building the future of biotech, neuroscience, and life sciences.",
    tags: ["biotech", "neurotech", "life sciences", "neuroscience"],
    bestFor: "Biotech founders, neuroscience researchers, life science entrepreneurs",
    character: "Rigorous and research-driven. FDA conversations frequent.",
    signal: "3 active trials",
    happeningNow: {
      signals: [
        "Regulatory office hours today",
        "3 founders prepping grant applications",
        "Lab access coordination ongoing"
      ],
      summary: "Deep work week. Good connections to AI floor for computational biology projects."
    },
    events: [
      { id: "e19", title: "Regulatory Office Hours", time: "Today, 2pm", host: "Dr. Sarah Chen" },
      { id: "e20", title: "Biotech Founders Lunch", time: "Fridays, 12pm", recurring: true },
      { id: "e21", title: "Grant Writing Workshop", time: "Next Tuesday, 3pm", host: "Dr. Sarah Chen" },
    ],
    leads: [
      { id: "l15", name: "Dr. Sarah Chen", role: "Biotech Advisor", avatar: "SC", helpsWith: "FDA pathways, clinical trials, grant applications" },
      { id: "l16", name: "Amir Patel", role: "Health Tech Founder", avatar: "AP", helpsWith: "Health tech GTM, payer relationships" },
    ],
    peopleToKnow: [
      { id: "p9", name: "Biotech founders", avatar: "BF", project: "Various therapeutics", whyNow: "Grant deadline approaching" },
    ],
    plugIn: [
      { id: "pi14", label: "Looking for computational biologist", type: "ask" },
      { id: "pi15", label: "Request lab access", type: "cta" },
    ],
  },
  {
    id: "floor-9",
    number: "9",
    name: "Artificial Intelligence",
    icon: "🦙",
    type: "thematic",
    description: "Builders working on models, agents, tooling, and applied AI products.",
    tags: ["agents", "infra", "tooling", "consumer AI"],
    bestFor: "Technical builders, founder feedback, product demos",
    character: "Deep technical conversations. Fast-moving, collaborative.",
    signal: "12 active this week",
    happeningNow: {
      signals: [
        "6 new members this week",
        "Demo prep energy this afternoon",
        "2 people open to meet today"
      ],
      summary: "Conversation is clustering around eval tooling, robotics adjacencies, and local inference."
    },
    events: [
      { id: "e22", title: "Agent Tooling Office Hours", time: "Tue, 2pm", host: "Nina Park" },
      { id: "e23", title: "AI Demo Circle", time: "Wed, 6pm", host: "Rotating" },
      { id: "e24", title: "Founder Feedback Hour", time: "Thu, 5:30pm", host: "Ava Morrison" },
      { id: "e25", title: "Open Build Lunch", time: "Fridays", recurring: true },
    ],
    leads: [
      { id: "l17", name: "Nina Park", role: "Floor Lead", avatar: "NP", helpsWith: "Onboarding, intros, floor operations" },
      { id: "l18", name: "Theo Chen", role: "Technical Lead", avatar: "TC", helpsWith: "Model architecture, research questions" },
    ],
    peopleToKnow: [
      { id: "p10", name: "Maya Chen", avatar: "MC", project: "Designing consumer AI interfaces", whyNow: "Hosting demo feedback Thursday" },
      { id: "p11", name: "Liam O'Brien", avatar: "LO", project: "MLOps and scaling infra", whyNow: "Open to meet on agent infra" },
      { id: "p12", name: "Daniel Kim", avatar: "DK", project: "AI x healthcare", whyNow: "Bridge to biotech and health teams" },
    ],
    plugIn: [
      { id: "pi16", label: "Add yourself", type: "cta" },
      { id: "pi17", label: "Request an intro", type: "cta" },
      { id: "pi18", label: "Looking for design partners", type: "ask" },
    ],
  },
  {
    id: "floor-10",
    number: "10",
    name: "Frontier@Accelerate",
    icon: "🚀",
    type: "thematic",
    description: "The accelerator program for early-stage founders building the future.",
    tags: ["accelerator", "startups", "fundraising", "mentorship"],
    bestFor: "Accelerator cohort, early-stage founders, mentorship seekers",
    character: "High intensity, fast-paced. Demo day energy.",
    signal: "Demo day prep",
    happeningNow: {
      signals: [
        "Cohort pitch practice in progress",
        "Mentor office hours today",
        "Demo day in 3 weeks"
      ],
      summary: "Demo day countdown mode. High energy and focused on fundraising prep."
    },
    events: [
      { id: "e26", title: "Pitch Practice", time: "Daily, 2pm", host: "Program Team" },
      { id: "e27", title: "Mentor Office Hours", time: "Tue & Thu, 3pm", recurring: true },
      { id: "e28", title: "Demo Day", time: "End of cohort", host: "Frontier Team" },
    ],
    leads: [
      { id: "l19", name: "Program Team", role: "Accelerator Leads", avatar: "PT", helpsWith: "Cohort support, investor intros, demo prep" },
      { id: "l20", name: "Mentor Network", role: "Advisors", avatar: "MN", helpsWith: "Domain expertise, fundraising, go-to-market" },
    ],
    peopleToKnow: [
      { id: "p13", name: "Current cohort founders", avatar: "CF", project: "Various early-stage startups", whyNow: "Open to feedback before demo day" },
    ],
    plugIn: [
      { id: "pi19", label: "Apply to next cohort", type: "cta" },
      { id: "pi20", label: "Become a mentor", type: "cta" },
    ],
  },
  {
    id: "floor-11",
    number: "11",
    name: "Health & Longevity",
    icon: "♾️",
    type: "thematic",
    description: "Founders working on healthspan, longevity science, and human performance.",
    tags: ["longevity", "healthspan", "biohacking", "wellness"],
    bestFor: "Longevity researchers, health optimization founders, wellness tech builders",
    character: "Science-driven and experimental. Self-quantification culture.",
    signal: "Longevity salon tonight",
    happeningNow: {
      signals: [
        "Longevity research discussion",
        "Biohacking workshop this week",
        "Cross-floor with biotech"
      ],
      summary: "Active discussion on latest longevity research. Good bridge to biotech floor."
    },
    events: [
      { id: "e29", title: "Longevity Salon", time: "Tonight, 7pm", host: "Dr. Alex Kim" },
      { id: "e30", title: "Biohacking Workshop", time: "Wed, 4pm", host: "Guest Speaker" },
      { id: "e31", title: "Health Optimization Hours", time: "Fridays", recurring: true },
    ],
    leads: [
      { id: "l21", name: "Dr. Alex Kim", role: "Longevity Researcher", avatar: "AK", helpsWith: "Longevity science, clinical connections" },
      { id: "l22", name: "Maya Torres", role: "Wellness Lead", avatar: "MT", helpsWith: "Health optimization, biohacking protocols" },
    ],
    peopleToKnow: [
      { id: "p14", name: "Longevity founders", avatar: "LF", project: "Healthspan startups", whyNow: "New research to discuss" },
    ],
    plugIn: [
      { id: "pi21", label: "Share your protocol", type: "cta" },
      { id: "pi22", label: "Join longevity salon", type: "cta" },
    ],
  },
  {
    id: "floor-12",
    number: "12",
    name: "Ethereum & Decentralized Tech",
    icon: "🔮",
    type: "thematic",
    description: "Builders working on Ethereum, decentralized protocols, and web3 infrastructure.",
    tags: ["ethereum", "web3", "crypto", "decentralized"],
    bestFor: "Crypto founders, protocol developers, web3 builders",
    character: "Technical and idealistic. Decentralization conversations happen.",
    signal: "Protocol workshop today",
    happeningNow: {
      signals: [
        "Protocol design workshop at 3pm",
        "2 teams prepping for hackathon",
        "Cross-floor with AI floor"
      ],
      summary: "Technical focus this week. Good connections to AI floor for crypto x AI projects."
    },
    events: [
      { id: "e32", title: "Protocol Design Workshop", time: "Today, 3pm", host: "Vitalik's Team" },
      { id: "e33", title: "Web3 Office Hours", time: "Fridays, 4pm", recurring: true },
      { id: "e34", title: "Ethereum Builders Lunch", time: "Wednesdays", recurring: true },
    ],
    leads: [
      { id: "l23", name: "Protocol Team", role: "Technical Leads", avatar: "PT", helpsWith: "Smart contracts, protocol design, security" },
      { id: "l24", name: "Web3 Advisors", role: "Ecosystem", avatar: "WA", helpsWith: "Token economics, governance, community" },
    ],
    peopleToKnow: [
      { id: "p15", name: "Protocol builders", avatar: "PB", project: "Decentralized infra", whyNow: "Hackathon prep mode" },
    ],
    plugIn: [
      { id: "pi23", label: "Looking for smart contract devs", type: "ask" },
      { id: "pi24", label: "Join protocol workshop", type: "cta" },
    ],
  },
  {
    id: "floor-14",
    number: "14",
    name: "Human Flourishing",
    icon: "🌷",
    type: "thematic",
    description: "Founders building for human potential, wellbeing, education, and personal growth.",
    tags: ["wellbeing", "education", "personal growth", "human potential"],
    bestFor: "Wellbeing founders, edtech builders, personal development innovators",
    character: "Thoughtful and human-centered. Deep conversations about meaning.",
    signal: "Philosophy salon tonight",
    happeningNow: {
      signals: [
        "Philosophy salon at 7pm",
        "Meditation circle this morning",
        "Cross-floor with longevity"
      ],
      summary: "Reflective energy this week. Good bridge to longevity and arts floors."
    },
    events: [
      { id: "e35", title: "Philosophy Salon", time: "Tonight, 7pm", host: "Dr. Maya Lin" },
      { id: "e36", title: "Meditation Circle", time: "Daily, 8am", recurring: true },
      { id: "e37", title: "Human Potential Meetup", time: "Next Wednesday", host: "Guest Speaker" },
    ],
    leads: [
      { id: "l25", name: "Dr. Maya Lin", role: "Flourishing Lead", avatar: "ML", helpsWith: "Philosophy, meaning, human potential" },
      { id: "l26", name: "James Chen", role: "Education Lead", avatar: "JC", helpsWith: "Learning design, edtech, personal growth" },
    ],
    peopleToKnow: [
      { id: "p16", name: "Flourishing founders", avatar: "FF", project: "Wellbeing and education", whyNow: "Philosophy salon tonight" },
    ],
    plugIn: [
      { id: "pi25", label: "Suggest a salon topic", type: "cta" },
      { id: "pi26", label: "Join meditation circle", type: "cta" },
    ],
  },
  {
    id: "floor-15",
    number: "15",
    name: "All Member Co-working",
    icon: "💿",
    type: "commons",
    description: "Open co-working space for all members. Hot desks, quiet zones, and collaboration areas.",
    tags: ["coworking", "hot desks", "collaboration"],
    bestFor: "Focused work, casual collaboration, meeting space",
    character: "Productive and welcoming. Mix of focus and conversation.",
    signal: "Open coworking",
    happeningNow: {
      signals: [
        "25 members working now",
        "Quiet zone available",
        "Meeting rooms open"
      ],
      summary: "Good energy for focused work. Mixed crowd from various floors."
    },
    events: [
      { id: "e38", title: "Morning Coffee", time: "Daily, 9am", recurring: true },
      { id: "e39", title: "Coworking Happy Hour", time: "Fridays, 5pm", recurring: true },
    ],
    leads: [
      { id: "l27", name: "Community Team", role: "Space Hosts", avatar: "CT", helpsWith: "Space norms, room bookings" },
    ],
    peopleToKnow: [
      { id: "p17", name: "Cross-floor members", avatar: "XF", project: "Various disciplines", whyNow: "Good for serendipitous intros" },
    ],
  },
  {
    id: "floor-16",
    number: "16",
    name: "Cross-Pollination Lounge",
    icon: "🏝️",
    type: "commons",
    description: "A shared space for casual coworking, informal meetings, salons, and cross-floor collisions.",
    tags: ["salon", "cross-disciplinary", "coworking"],
    bestFor: "Casual intros, small group conversations, cross-floor collisions",
    character: "Relaxed and serendipitous. Best views in the building.",
    signal: "Salon tonight 7pm",
    happeningNow: {
      signals: [
        "Open coworking now",
        "Salon tonight at 7",
        "Mixed traffic from Floors 6, 9, and 10"
      ],
      summary: "Afternoon coworking session. Tonight's salon theme: How can AI help climate tech?"
    },
    events: [
      { id: "e40", title: "Evening Salon", time: "Tonight, 7pm", host: "Community" },
      { id: "e41", title: "Sunrise Meditation", time: "Daily, 6am", recurring: true },
      { id: "e42", title: "Friday Coworking", time: "Fridays all day", recurring: true },
    ],
    leads: [
      { id: "l28", name: "Rotating Hosts", role: "Salon Hosts", avatar: "RH", helpsWith: "Conversation facilitation, intros" },
    ],
    peopleToKnow: [
      { id: "p18", name: "Cross-floor regulars", avatar: "XF", project: "Various disciplines", whyNow: "Often here for collisions" },
    ],
    plugIn: [
      { id: "pi27", label: "Suggest a salon topic", type: "cta" },
      { id: "pi28", label: "Host a session", type: "cta" },
    ],
  },
]

export function getFloorById(id: string): Floor | undefined {
  return floors.find(floor => floor.id === id)
}

export function getFloorTypeColor(type: FloorType): string {
  switch (type) {
    case "thematic":
      return "bg-floor-thematic"
    case "commons":
      return "bg-floor-commons"
    case "private":
      return "bg-floor-private"
  }
}
