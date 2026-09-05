export type Lang = "es" | "en";

export const WHATSAPP = "17865779275";

export const copy = {
  es: {
    htmlLang: "es",
    title: "Scotting — Sistemas y automatización para negocios que ya funcionan | Miami",
    metaDescription:
      "Soy Eduardo Scott. Ingeniero en Miami. Construyo sistemas y automatizaciones para negocios que ya están andando. La automatización es mi paso 4, no el primero.",
    switchTo: "English",
    switchHref: "/en",

    nav: { services: "Servicios", work: "Lo que he construido", contact: "Contacto" },

    hero: {
      kickerBefore: "Hay algo en tu negocio que ",
      kickerAccent: "todavía haces a mano",
      kickerAfter: ".",
      headline: "Tu negocio ya funciona. Vamos a quitarle lo manual.",
      body: [
        "Soy Eduardo Scott. Ingeniero, 15 años en software, aquí en Miami.",
        "Construyo sistemas y automatizaciones para negocios que ya están andando.",
      ],
      cta: "Hablemos por WhatsApp",
    },

    services: {
      eyebrow: "Servicios",
      title: "Tres formas de empezar.",
      lead: "Empezamos por donde más necesites apoyo. Casi siempre, por la primera.",
      items: [
        {
          name: "Consultoría 1 a 1 en tecnología",
          claim: "Nos sentamos, me cuentas cómo trabajas, y te digo qué te conviene y qué no. Sin venderte nada primero.",
          icon: "/service-consult.svg",
          points: [
            "Reviso cómo operas hoy, paso por paso",
            "Qué herramientas te sirven y cuáles estás pagando de más",
            "Un plan por escrito, en orden de prioridad",
            "Sesiones para que tú mismo las puedas manejar",
          ],
        },
        {
          name: "Apps y páginas web",
          claim: "Tu sitio, o la app que tu negocio necesita. Diseñada, construida y publicada por mí.",
          icon: "/service-build.svg",
          points: [
            "Sitios que se entienden en diez segundos",
            "Apps hechas a la medida de cómo trabajas",
            "Que aparezcas en Google cuando te buscan",
            "Listo para invertir en anuncios sin quemar el dinero",
          ],
        },
        {
          name: "Agentes de IA",
          claim: "Programas que hacen solos el trabajo repetitivo: buscan, ordenan, responden y te avisan.",
          icon: "/service-agent.svg",
          points: [
            "Agentes que buscan y califican clientes",
            "Respuestas automáticas que suenan a ti",
            "Reportes que se arman solos",
            "Conectar las herramientas que ya usas",
          ],
        },
      ],
    },

    cases: {
      eyebrow: "Qué hago",
      title: "Un problema real. Lo que hice.",
      problemLabel: "El problema",
      solutionLabel: "Lo que hice",
      items: [
        {
          name: "Picktennt",
          problem:
            "Cada torneo se armaba a mano. Inscripciones por WhatsApp, cuadros en papel, resultados cargados uno por uno.",
          solution:
            "Una app donde el jugador se inscribe solo, los cuadros se arman solos, y los resultados suben a DUPR automáticamente.",
          mark: "/node-network.svg",
        },
        {
          name: "Mi propio negocio",
          problem:
            "Buscar clientes era abrir Google Maps y anotar en un Excel, uno por uno.",
          solution:
            "Un agente que arma la lista, la califica y me dice a quién llamar primero. Este lo construí para mí.",
          mark: "/node-growth.svg",
        },
        {
          name: "Pool Control Solutions",
          problem:
            "Nos iba bien de boca en boca. Pero si alguien nos buscaba en Google, no aparecíamos por ningún lado.",
          solution:
            "Les construí el sitio y escribí el contenido, el de la web y el de su ficha de Google. Armado alrededor de lo que la gente de verdad busca: mantenimiento de piscinas en Kendall, Doral, Pinecrest, Homestead.",
          mark: "/node-bridge.svg",
        },
      ],
      cta: "Hablemos por WhatsApp",
    },

    process: {
      eyebrow: "Cómo trabajo",
      title: "La automatización es mi paso 4. No el primero.",
      body: "Muchos llegan con una herramienta bajo el brazo y te la venden antes de mirar cómo trabajas. Yo primero miro. A veces lo que necesitas no es automatizar nada — es cambiar el orden de dos pasos.",
      hint: "Pasa por cada paso para ver de qué se trata.",
      cycle: "No es una línea que termina en la entrega. Es un ciclo.",
      steps: [
        { label: "Detecto", note: "Miro cómo trabajas hoy. Sin cambiar nada todavía." },
        { label: "Analizo", note: "Qué cuesta tiempo, qué cuesta errores, qué cuesta dinero." },
        { label: "Soluciono", note: "Diseño y construyo la solución. A veces es software, a veces es cambiar el orden." },
        { label: "Automatizo", note: "Implemento solo lo que ya sabemos que funciona." },
        { label: "Mejoro", note: "Evalúo lo que quedó andando, corrijo, y el ciclo empieza otra vez." },
      ],
      loop: "Y vuelve a empezar",
    },

    about: {
      eyebrow: "Quién soy",
      title: "Soy Eduardo Scott.",
      paragraphs: [
        "Soy ingeniero. 15 años en software, los últimos 10 con datos y liderando equipos de tecnología.",
        "Publiqué mi primera app, KIDI, en la App Store en 2012: el día del lanzamiento entró al top 100 mundial de descargas. De ahí me especialicé en portales de noticias, publicidad programática y ad servers, y ese camino me llevó al big data, al adtech y a los productos digitales.",
        "Fui consultor digital de grandes grupos de medios: Grupo Nación en Costa Rica, y Medios Masivos Mexicanos, de los cinco de mayor tráfico de México. Después manejé la operación de ingresos con anunciantes y marcas en Connatix, una empresa de tecnología. Cuando se fusionó con JWX, me tocó unificar las herramientas y los procesos de las dos empresas.",
        "Asesoré, pero también construí. Estudié analítica de datos en Georgia Tech y tengo varios diplomas en gestión de proyectos y de producto.",
        "Hoy hago lo mismo a otra escala: entro a un negocio que ya funciona y construyo la herramienta que le falta. Lo que entrego no lo dejo ahí, lo mantengo bajo mejora constante y con soporte.",
        "Vivo en Miami. Nos vemos por un café en Brickell o en Coral Gables, o lo conversamos después de una partida de pickleball en Tropical Park. Y si no quieres pelear con el tráfico, nos vemos en línea.",
      ],
      photoAlt: "Eduardo Scott, en Miami",
      caption: "Eduardo Scott · Miami, Florida",
    },

    beliefs: {
      eyebrow: "En qué creo",
      opener: "There has to be a smarter way to do this.",
      openerNote: "La frase con la que empieza cada proyecto.",
      items: [
        "Te explico antes de venderte.",
        "Si lo que haces a mano ya funciona, te lo digo.",
        "La mejor herramienta es la que puedes manejar sin mí.",
        "Empezamos pequeño. Lo que funciona, crece.",
      ],
    },


    work: {
      eyebrow: "Lo que he construido",
      title: "No vendo una categoría. Miro cómo trabajas y arreglo lo que estorba.",
      groups: [
        {
          label: "Sitios y presencia",
          mark: "/node-bridge.svg",
          items: [
            { name: "Pool Control Solutions", url: "https://www.poolcontrolsolutions.com" },
            { name: "Sotillo & Asociados", url: "https://sotilloasociados.com" },
            { name: "Keenkaya", url: "https://keenkaya.com" },
            { name: "Picktennt", url: "https://picktennt.com" },
          ],
        },
        {
          label: "Sistemas y automatización",
          mark: "/node-network.svg",
          items: [
            { name: "Agente de prospección", url: null },
            { name: "Integración con DUPR", url: null },
            { name: "Control de mandos", url: null },
          ],
        },
        {
          label: "Formación",
          mark: "/node-ring-full.svg",
          items: [
            { name: "Curso Claude 10x", url: "https://idddeas.com/curso_claude_10x" },
            { name: "Acompañamiento 1 a 1", url: null },
          ],
        },
      ],
      cta: "Hablemos por WhatsApp",
    },

    form: {
      eyebrow: "Cuéntame",
      title: "¿Qué hiciste a mano esta semana que ya podría hacerse solo?",
      chips: [
        "Cotizaciones",
        "Agendar citas",
        "Facturación",
        "Seguimiento a clientes",
        "Reportes",
        "Mi página web",
        "Otra cosa",
      ],
      chipsHint: "Puedes escoger varias.",
      detailLabel: "Cuéntame en una línea",
      detailOptional: "opcional",
      nameLabel: "Nombre",
      contactLabel: "WhatsApp o correo",
      submit: "Enviar",
      reassurance: "Te respondo yo, no un bot. Normalmente el mismo día.",
      chipRequired: "Escoge una opción para empezar.",
      contactRequired: "Déjame un WhatsApp o un correo para poder responderte.",
      success: "Eso es exactamente lo que construyo. Te escribo hoy mismo.",
      sending: "Enviando…",
    },

    sticky: { label: "Escríbeme" },

    footer: {
      tagline: "Smart systems. Real impact.",
      location: "Miami, Florida",
      rights: "Todos los derechos reservados.",
    },

    waIntro: "Hola Eduardo, vengo de tu página",
  },

  en: {
    htmlLang: "en",
    title: "Scotting — Systems and automation for businesses that already work | Miami",
    metaDescription:
      "I'm Eduardo Scott. Engineer in Miami. I build systems and automation for businesses that are already running. Automation is my step four, not my first.",
    switchTo: "Español",
    switchHref: "/",

    nav: { services: "Services", work: "What I've built", contact: "Contact" },

    hero: {
      kickerBefore: "There's something in your business you ",
      kickerAccent: "still do by hand",
      kickerAfter: ".",
      headline: "Your business already works. Let's take the manual part out.",
      body: [
        "I'm Eduardo Scott. Engineer, 15 years in software, here in Miami.",
        "I build systems and automation for businesses that are already running.",
      ],
      cta: "Let's talk on WhatsApp",
    },

    services: {
      eyebrow: "Services",
      title: "Three ways to start.",
      lead: "We start wherever you need the most help. Usually with the first one.",
      items: [
        {
          name: "One-on-one tech consulting",
          claim: "We sit down, you tell me how you work, and I tell you what's worth doing and what isn't. Before I sell you anything.",
          icon: "/service-consult.svg",
          points: [
            "I go through how you operate today, step by step",
            "Which tools help you and which ones you're overpaying for",
            "A written plan, in order of priority",
            "Sessions so you can run it yourself",
          ],
        },
        {
          name: "Apps and websites",
          claim: "Your site, or the app your business needs. Designed, built and shipped by me.",
          icon: "/service-build.svg",
          points: [
            "Sites people understand in ten seconds",
            "Apps built around how you actually work",
            "Showing up on Google when people look for you",
            "Ready to put ad money behind without burning it",
          ],
        },
        {
          name: "AI agents",
          claim: "Programs that do the repetitive work on their own: they search, sort, reply and tell you what matters.",
          icon: "/service-agent.svg",
          points: [
            "Agents that find and score leads",
            "Automatic replies that sound like you",
            "Reports that build themselves",
            "Connecting the tools you already use",
          ],
        },
      ],
    },

    cases: {
      eyebrow: "What I do",
      title: "A real problem. What I did.",
      problemLabel: "The problem",
      solutionLabel: "What I did",
      items: [
        {
          name: "Picktennt",
          problem:
            "Every tournament ran by hand. Sign-ups over WhatsApp, brackets on paper, results typed in one by one.",
          solution:
            "An app where players sign themselves up, brackets build themselves, and results post to DUPR automatically.",
          mark: "/node-network.svg",
        },
        {
          name: "My own business",
          problem:
            "Finding clients meant opening Google Maps and typing into a spreadsheet, one by one.",
          solution:
            "An agent that builds the list, scores it, and tells me who to call first. I built this one for myself.",
          mark: "/node-growth.svg",
        },
        {
          name: "Pool Control Solutions",
          problem:
            "Word of mouth was working for us. But if somebody looked us up on Google, we were nowhere.",
          solution:
            "I built the site and wrote the content, both for the site and for their Google listing. Built around what people actually search for: pool maintenance in Kendall, Doral, Pinecrest, Homestead.",
          mark: "/node-bridge.svg",
        },
      ],
      cta: "Let's talk on WhatsApp",
    },

    process: {
      eyebrow: "How I work",
      title: "Automation is my step four. Not my first.",
      body: "Plenty of people show up with a tool already in hand and sell it before looking at how you work. I look first. Sometimes what you need isn't automation at all — it's swapping the order of two steps.",
      hint: "Hover any step to see what it means.",
      cycle: "It is not a line that ends at delivery. It is a cycle.",
      steps: [
        { label: "Detect", note: "I look at how you work today. Nothing changes yet." },
        { label: "Analyze", note: "What costs time, what costs errors, what costs money." },
        { label: "Solve", note: "I design and build the solution. Sometimes it's software, sometimes it's the order." },
        { label: "Automate", note: "I roll out only what we already know works." },
        { label: "Improve", note: "I check what's actually running, fix it, and the cycle starts again." },
      ],
      loop: "And it starts again",
    },

    about: {
      eyebrow: "Who I am",
      title: "I'm Eduardo Scott.",
      paragraphs: [
        "I'm an engineer. 15 years in software, the last 10 with data and leading technology teams.",
        "I shipped my first app, KIDI, on the App Store in 2012: on launch day it broke into the global top 100 for downloads. From there I specialized in news portals, programmatic advertising and ad servers, and that road took me into big data, adtech and digital products.",
        "I was a digital consultant for large media groups: Grupo Nación in Costa Rica, and Medios Masivos Mexicanos, one of the five highest-traffic media groups in Mexico. Then I was Demand Revenue Operations Manager at Connatix, a technology company. When it merged with JWX, I unified the tools and processes of both companies.",
        "I advised, but I also built. I studied data analytics at Georgia Tech and hold several certificates in project and product management.",
        "Today I do the same thing at a different scale: I walk into a business that already works and build the tool it's missing. What I hand over doesn't stop there. I keep it under constant improvement, with support.",
        "I live in Miami. We can meet over coffee in Brickell or Coral Gables, or talk it through after a pickleball game at Tropical Park. And if you'd rather not fight traffic, we meet online.",
      ],
      photoAlt: "Eduardo Scott, in Miami",
      caption: "Eduardo Scott · Miami, Florida",
    },

    beliefs: {
      eyebrow: "What I believe",
      opener: "There has to be a smarter way to do this.",
      openerNote: "The sentence every project starts with.",
      items: [
        "I explain before I sell.",
        "If doing it by hand already works, I'll tell you.",
        "The best tool is the one you can run without me.",
        "We start small. What works, grows.",
      ],
    },


    work: {
      eyebrow: "What I've built",
      title: "I don't sell a category. I look at how you work and fix what's in the way.",
      groups: [
        {
          label: "Sites and presence",
          mark: "/node-bridge.svg",
          items: [
            { name: "Pool Control Solutions", url: "https://www.poolcontrolsolutions.com" },
            { name: "Sotillo & Asociados", url: "https://sotilloasociados.com" },
            { name: "Keenkaya", url: "https://keenkaya.com" },
            { name: "Picktennt", url: "https://picktennt.com" },
          ],
        },
        {
          label: "Systems and automation",
          mark: "/node-network.svg",
          items: [
            { name: "Lead prospecting agent", url: null },
            { name: "DUPR integration", url: null },
            { name: "Operations dashboard", url: null },
          ],
        },
        {
          label: "Training",
          mark: "/node-ring-full.svg",
          items: [
            { name: "Claude 10x course", url: "https://idddeas.com/curso_claude_10x" },
            { name: "One-on-one coaching", url: null },
          ],
        },
      ],
      cta: "Let's talk on WhatsApp",
    },

    form: {
      eyebrow: "Tell me",
      title: "What did you do by hand this week that could already run on its own?",
      chips: [
        "Quotes",
        "Booking",
        "Invoicing",
        "Following up with clients",
        "Reports",
        "My website",
        "Something else",
      ],
      chipsHint: "Pick as many as you like.",
      detailLabel: "Tell me in one line",
      detailOptional: "optional",
      nameLabel: "Name",
      contactLabel: "WhatsApp or email",
      submit: "Send",
      reassurance: "I answer, not a bot. Usually same day.",
      chipRequired: "Pick one to get started.",
      contactRequired: "Leave a WhatsApp or email so I can reply.",
      success: "That's exactly what I build. I'll write you today.",
      sending: "Sending…",
    },

    sticky: { label: "Message me" },

    footer: {
      tagline: "Smart systems. Real impact.",
      location: "Miami, Florida",
      rights: "All rights reserved.",
    },

    waIntro: "Hi Eduardo, I came from your website",
  },
};

export type Copy = (typeof copy)["es"];

export function waLink(lang: Lang, context: string) {
  const text = `${copy[lang].waIntro} — ${context}`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
}
