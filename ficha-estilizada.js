/* Fichas com estilo único por Pokémon.
   O estilo (paleta, marca-d'água, frase e efeito) vem da Edge Function
   "pokemon-style", que analisa o Pokémon com a IA da Groq e guarda o
   resultado na tabela public.pokemon_styles.
   Compatibilidade máxima: sem fetch, async/await ou sintaxe ES6. */
(function () {
  var CHAVE_CACHE = "estilosFichaPokedex";
  var EFEITOS = ["raios", "chamas", "bolhas", "folhas", "cristais", "estrelas", "nevoa", "ondas", "circuito", "petalas", "fragmentos", "espinhos"];

  /* ------------------------------------------------------------------ */
  /* Cache local: evita chamar a IA de novo no mesmo navegador.          */
  /* ------------------------------------------------------------------ */
  function lerCache() {
    try { return JSON.parse(localStorage.getItem(CHAVE_CACHE)) || {}; } catch (e) { return {}; }
  }
  function gravarCache(id, estilo) {
    try {
      var tudo = lerCache();
      tudo[id] = estilo;
      localStorage.setItem(CHAVE_CACHE, JSON.stringify(tudo));
    } catch (e) { /* localStorage cheio ou bloqueado: seguimos sem cache. */ }
  }

  /* ------------------------------------------------------------------ */
  /* Estilo de segurança: usado sem internet ou sem Supabase.            */
  /* Espelha o fallback da Edge Function.                                */
  /* ------------------------------------------------------------------ */
  var PALETA_TIPO = {
    normal: ["#7b8495", "#a9b0bd", "estrelas"], fire: ["#d74632", "#ff9a42", "chamas"],
    water: ["#2877cf", "#62b9ee", "bolhas"], electric: ["#d5a500", "#ffe36b", "raios"],
    grass: ["#3f9b59", "#9ad968", "folhas"], ice: ["#3c9ab8", "#a5e8f2", "cristais"],
    fighting: ["#b6443a", "#e78259", "fragmentos"], poison: ["#8b4ab1", "#d28cdf", "bolhas"],
    ground: ["#a87434", "#e5c66c", "fragmentos"], flying: ["#6d7cc8", "#b4bdf5", "nevoa"],
    psychic: ["#cf4e83", "#ff9fc5", "estrelas"], bug: ["#719b2e", "#b7d65d", "folhas"],
    rock: ["#9e7d3c", "#d7ba67", "fragmentos"], ghost: ["#624d91", "#a58bce", "nevoa"],
    dragon: ["#5451c6", "#a494ff", "cristais"], dark: ["#4b5266", "#9299ad", "nevoa"],
    steel: ["#6b8494", "#b3c7d3", "circuito"], fairy: ["#c75d9c", "#f3a9d2", "petalas"]
  };

  function escurecer(hex, fator) {
    var n = parseInt(hex.slice(1), 16);
    function ajusta(v) { return Math.max(0, Math.min(255, Math.round(v * fator))); }
    var partes = [ajusta((n >> 16) & 255), ajusta((n >> 8) & 255), ajusta(n & 255)], i, saida = "#";
    for (i = 0; i < 3; i++) saida += ("0" + partes[i].toString(16)).slice(-2);
    return saida;
  }

  function estiloLocal(p) {
    var tipos = [], i;
    for (i = 0; i < p.types.length; i++) tipos.push(p.types[i].type.name);
    var base = PALETA_TIPO[tipos[0]] || PALETA_TIPO.normal;
    var fontes = ["helvetica", "times", "courier"];
    return {
      pokemon_id: p.id, nome: p.name, tipos: tipos,
      titulo: "REGISTRO " + String(tipos[0] || "normal").toUpperCase(),
      frase: "Treine. Descubra. Evolua.",
      efeito: base[2],
      fonte: fontes[p.id % 3],
      marca: { texto: String(p.name).toUpperCase(), opacidade: 0.08, rotacao: 18 + (p.id % 5) * 5 },
      paleta: {
        primaria: escurecer(base[0], 1 - (p.id % 7) * 0.02), secundaria: base[1],
        destaque: escurecer(base[0], 0.75), fundo: "#f7f5fd", texto: "#20243b"
      },
      origem: "local"
    };
  }

  function normalizar(estilo, p) {
    var reserva = estiloLocal(p);
    if (!estilo || !estilo.paleta) return reserva;
    var paleta = estilo.paleta, chaves = ["primaria", "secundaria", "destaque", "fundo", "texto"], i;
    for (i = 0; i < chaves.length; i++) {
      if (!/^#[0-9a-fA-F]{6}$/.test(String(paleta[chaves[i]]))) paleta[chaves[i]] = reserva.paleta[chaves[i]];
    }
    var achou = false;
    for (i = 0; i < EFEITOS.length; i++) if (EFEITOS[i] === estilo.efeito) achou = true;
    if (!achou) estilo.efeito = reserva.efeito;
    if (!estilo.marca || !estilo.marca.texto) estilo.marca = reserva.marca;
    if (!estilo.titulo) estilo.titulo = reserva.titulo;
    if (!estilo.frase) estilo.frase = reserva.frase;
    if (!estilo.fonte) estilo.fonte = reserva.fonte;
    return estilo;
  }

  /* ------------------------------------------------------------------ */
  /* Busca do estilo: cache local -> tabela pública -> Edge Function.    */
  /* ------------------------------------------------------------------ */
  window.obterEstiloPokemon = function (p, pronto) {
    var salvo = lerCache()[p.id];
    if (salvo) { pronto(normalizar(salvo, p)); return; }

    if (!window.supabaseClient) { pronto(estiloLocal(p)); return; }

    function pelaIA() {
      window.supabaseClient.functions
        .invoke("pokemon-style", { body: { pokemon: String(p.id) } })
        .then(function (r) {
          if (r.error || !r.data || !r.data.estilo) { pronto(estiloLocal(p)); return; }
          var estilo = normalizar(r.data.estilo, p);
          gravarCache(p.id, estilo);
          pronto(estilo);
        })
        .catch(function () { pronto(estiloLocal(p)); });
    }

    /* A tabela tem leitura pública: se o estilo já existe, nem chamamos a IA. */
    window.supabaseClient.from("pokemon_styles").select("estilo").eq("pokemon_id", p.id).maybeSingle()
      .then(function (r) {
        if (!r.error && r.data && r.data.estilo) {
          var estilo = normalizar(r.data.estilo, p);
          gravarCache(p.id, estilo);
          pronto(estilo);
          return;
        }
        pelaIA();
      })
      .catch(pelaIA);
  };

  /* ------------------------------------------------------------------ */
  /* Desenho dos efeitos no PDF                                          */
  /* ------------------------------------------------------------------ */
  function hexRgb(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }
  function sorteio(semente) {
    var s = (semente * 9301 + 49297) % 233280;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }
  function comOpacidade(doc, valor, desenhar) {
    var usou = false;
    try {
      if (doc.GState && doc.setGState) {
        doc.saveGraphicsState();
        /* "opacity" só afeta preenchimento; o traço precisa de "stroke-opacity". */
        doc.setGState(new doc.GState({ opacity: valor, "stroke-opacity": valor }));
        usou = true;
      }
    } catch (e) { usou = false; }
    desenhar();
    if (usou) { try { doc.restoreGraphicsState(); } catch (e) { } }
  }

  /* Contraste (WCAG) para não imprimir texto ilegível. */
  function luminancia(hex) {
    var rgb = hexRgb(hex), i, c = [];
    for (i = 0; i < 3; i++) {
      var v = rgb[i] / 255;
      c.push(v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    }
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrasteComBranco(hex) { return 1.05 / (luminancia(hex) + 0.05); }
  /* Fundo para texto branco: escurece até o texto ficar legível. */
  function fundoParaTextoBranco(hex) {
    var cor = hex, tentativas = 0;
    while (contrasteComBranco(cor) < 3.6 && tentativas < 8) { cor = escurecer(cor, 0.78); tentativas++; }
    return cor;
  }

  /* O Word (HTML legado) ignora "opacity". Para ter marca-d'água de verdade,
     misturamos a cor com o fundo e geramos uma cor clara sólida equivalente. */
  function misturar(hex, hexFundo, peso) {
    var a = hexRgb(hex), b = hexRgb(hexFundo), i, saida = "#";
    for (i = 0; i < 3; i++) {
      var v = Math.round(b[i] + (a[i] - b[i]) * peso);
      if (v < 0) v = 0; if (v > 255) v = 255;
      saida += ("0" + v.toString(16)).slice(-2);
    }
    return saida;
  }

  /* Cada efeito é um carimbo desenhado várias vezes em posições sorteadas. */
  function carimbo(doc, efeito, x, y, t) {
    var i, deltas;
    if (efeito === "raios") {
      deltas = [[t * 0.34, t * 0.52], [-t * 0.2, 0], [t * 0.22, t * 0.48], [-t * 0.56, -t * 0.6], [t * 0.2, 0], [-t * 0.16, -t * 0.4]];
      doc.lines(deltas, x, y, [1, 1], "F", true);
    } else if (efeito === "chamas") {
      doc.triangle(x, y + t, x + t * 0.5, y - t * 0.15, x + t, y + t, "F");
      doc.ellipse(x + t * 0.5, y + t * 0.72, t * 0.42, t * 0.32, "F");
    } else if (efeito === "bolhas") {
      doc.circle(x, y, t * 0.5, "S");
      doc.circle(x + t * 0.55, y + t * 0.5, t * 0.22, "S");
    } else if (efeito === "folhas") {
      doc.ellipse(x, y, t * 0.55, t * 0.24, "F");
      doc.ellipse(x + t * 0.35, y + t * 0.45, t * 0.3, t * 0.14, "F");
    } else if (efeito === "cristais") {
      doc.lines([[t * 0.42, t * 0.62], [-t * 0.42, t * 0.62], [-t * 0.42, -t * 0.62]], x, y - t * 0.62, [1, 1], "F", true);
    } else if (efeito === "estrelas") {
      doc.lines([[t * 0.18, t * 0.42], [t * 0.42, t * 0.18], [-t * 0.42, t * 0.18], [-t * 0.18, t * 0.42],
      [-t * 0.18, -t * 0.42], [-t * 0.42, -t * 0.18], [t * 0.42, -t * 0.18]], x, y - t * 0.6, [1, 1], "F", true);
    } else if (efeito === "nevoa") {
      doc.ellipse(x, y, t * 0.75, t * 0.26, "F");
      doc.ellipse(x + t * 0.5, y + t * 0.4, t * 0.5, t * 0.18, "F");
    } else if (efeito === "ondas") {
      deltas = [];
      for (i = 0; i < 8; i++) deltas.push([t * 0.2, (i % 2 === 0 ? 1 : -1) * t * 0.16]);
      doc.lines(deltas, x, y, [1, 1], "S", false);
    } else if (efeito === "circuito") {
      doc.lines([[t * 0.7, 0], [0, t * 0.55], [t * 0.5, 0]], x, y, [1, 1], "S", false);
      doc.circle(x + t * 1.2, y + t * 0.55, t * 0.14, "F");
      doc.circle(x, y, t * 0.14, "F");
    } else if (efeito === "petalas") {
      for (i = 0; i < 5; i++) {
        var ang = (Math.PI * 2 * i) / 5;
        doc.ellipse(x + Math.cos(ang) * t * 0.4, y + Math.sin(ang) * t * 0.4, t * 0.26, t * 0.16, "F");
      }
    } else if (efeito === "espinhos") {
      doc.triangle(x, y + t, x + t * 0.26, y - t * 0.3, x + t * 0.52, y + t, "F");
    } else { /* fragmentos */
      doc.triangle(x, y, x + t * 0.85, y + t * 0.2, x + t * 0.3, y + t * 0.9, "F");
    }
  }

  /* Efeitos desenhados com traço ficam mais "pesados" que os preenchidos. */
  var EFEITO_TRACO = { bolhas: 1, ondas: 1, circuito: 1 };

  function camadaEfeito(doc, estilo, area, cor, opacidade, quantidade, escala) {
    var rand = sorteio(estilo.pokemon_id + area.y), rgb = hexRgb(cor), i;
    if (EFEITO_TRACO[estilo.efeito]) opacidade = opacidade * 0.7;
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.setLineWidth(0.35);
    comOpacidade(doc, opacidade, function () {
      for (i = 0; i < quantidade; i++) {
        var x = area.x + rand() * area.w, y = area.y + rand() * area.h, t = escala * (0.6 + rand() * 0.9);
        carimbo(doc, estilo.efeito, x, y, t);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* PDF                                                                 */
  /* ------------------------------------------------------------------ */
  window.baixarFichaPDF = function (botao) {
    var pokemon = window.atualPokemon && window.atualPokemon();
    if (!pokemon) { alert("Pesquise um Pokémon primeiro."); return; }
    if (!window.jspdf) { alert("O gerador de PDF ainda está carregando. Tente novamente em alguns segundos."); return; }

    var rotulo = botao && botao.innerHTML;
    if (botao) { botao.disabled = true; botao.innerHTML = "🎨 Criando estilo…"; }
    function liberar() { if (botao) { botao.disabled = false; botao.innerHTML = rotulo; } }

    window.obterEstiloPokemon(pokemon, function (estilo) {
      var arte = new Image();
      arte.crossOrigin = "anonymous";
      arte.onload = function () { montarPDF(pokemon, estilo, arte); liberar(); };
      arte.onerror = function () { montarPDF(pokemon, estilo, null); liberar(); };
      arte.src = pokemon.sprites.other["official-artwork"].front_default || pokemon.sprites.front_default;
    });
  };

  function montarPDF(pokemon, estilo, imagem) {
    var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    var paleta = estilo.paleta;
    /* Cores "sólidas": versões escurecidas para quando o texto por cima é branco. */
    var solidaPrim = fundoParaTextoBranco(paleta.primaria);
    var solidaSec = fundoParaTextoBranco(paleta.secundaria);
    var tituloCor = fundoParaTextoBranco(paleta.primaria);
    var c1 = hexRgb(solidaPrim), c2 = hexRgb(paleta.secundaria), cS = hexRgb(solidaSec);
    var cTit = hexRgb(tituloCor), cD = hexRgb(fundoParaTextoBranco(paleta.destaque));
    var cF = hexRgb(paleta.fundo), cT = hexRgb(paleta.texto);
    var fonte = estilo.fonte || "helvetica";
    var tipos = [], i;
    for (i = 0; i < pokemon.types.length; i++) tipos.push(pokemon.types[i].type.name);

    /* Fundo da página */
    doc.setFillColor(cF[0], cF[1], cF[2]);
    doc.rect(0, 0, 210, 297, "F");

    /* Efeito exclusivo espalhado pela página */
    camadaEfeito(doc, estilo, { x: 4, y: 58, w: 202, h: 232 }, paleta.primaria, 0.07, 26, 12);

    /* Cabeçalho */
    doc.setFillColor(c1[0], c1[1], c1[2]);
    doc.rect(0, 0, 210, 48, "F");
    doc.setFillColor(c2[0], c2[1], c2[2]);
    doc.rect(0, 48, 210, 5, "F");
    camadaEfeito(doc, estilo, { x: 0, y: 2, w: 210, h: 44 }, paleta.secundaria, 0.4, 16, 8);

    /* Pokébola decorativa */
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1.2);
    doc.circle(182, 25, 17);
    doc.line(165, 25, 199, 25);
    doc.setFillColor(c2[0], c2[1], c2[2]);
    doc.circle(182, 25, 5, "F");
    doc.setDrawColor(255, 255, 255);
    doc.circle(182, 25, 5);

    doc.setTextColor(255, 255, 255);
    doc.setFont(fonte, "bold");
    doc.setFontSize(24);
    doc.text("FICHA POKÉDEX", 18, 23);
    doc.setFont(fonte, "normal");
    doc.setFontSize(9);
    doc.text(String(estilo.titulo).substring(0, 34), 18, 32);
    doc.setFontSize(7.5);
    doc.text("ESTILO GERADO POR IA • REGISTRO DIGITAL", 18, 40);

    /* Cartão principal */
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(16, 62, 178, 205, 7, 7, "F");
    doc.setDrawColor(c2[0], c2[1], c2[2]);
    doc.setLineWidth(0.8);
    doc.roundedRect(16, 62, 178, 205, 7, 7, "S");
    /* Textura do efeito dentro do cartão */
    camadaEfeito(doc, estilo, { x: 22, y: 68, w: 166, h: 192 }, paleta.destaque, 0.045, 16, 9);

    /* Marca-d'água gigante criada pela IA — por cima do cartão para aparecer,
       mas antes do conteúdo e com opacidade baixa para não atrapalhar a leitura. */
    doc.setFont(fonte, "bold");
    /* Nomes longos encolhem para nunca vazar do cartão. */
    doc.setFontSize(Math.max(26, Math.min(58, 420 / Math.max(estilo.marca.texto.length, 4))));
    doc.setTextColor(cTit[0], cTit[1], cTit[2]);
    /* A marca-d'água precisa ser percebida sem competir com o texto:
       usamos um piso de opacidade, já que valores muito baixos somem na impressão. */
    comOpacidade(doc, Math.max(estilo.marca.opacidade, 0.19), function () {
      doc.text(estilo.marca.texto, 34, 228, { angle: estilo.marca.rotacao, baseline: "middle" });
    });

    /* Nome e número */
    doc.setTextColor(cT[0], cT[1], cT[2]);
    doc.setFont(fonte, "bold");
    doc.setFontSize(26);
    doc.text(String(pokemon.name).toUpperCase(), 28, 80);
    doc.setFont(fonte, "normal");
    doc.setFontSize(10);
    doc.setTextColor(cD[0], cD[1], cD[2]);
    doc.text("Nº " + ("0000" + pokemon.id).slice(-4) + "  •  FICHA DE TREINADOR", 28, 88);

    if (imagem) { try { doc.addImage(imagem, "PNG", 108, 62, 72, 72); } catch (e) { } }

    /* Selo de tipos (cor sólida: o texto por cima é branco) */
    doc.setFillColor(cS[0], cS[1], cS[2]);
    doc.roundedRect(28, 96, 72, 11, 5, 5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(fonte, "bold");
    doc.setFontSize(9.5);
    doc.text(tipos.join(" • ").toUpperCase(), 34, 103);

    /* Dados principais */
    doc.setTextColor(cTit[0], cTit[1], cTit[2]);
    doc.setFontSize(12);
    doc.text("DADOS PRINCIPAIS", 28, 121);
    doc.setFont(fonte, "normal");
    doc.setFontSize(11);
    doc.setTextColor(cT[0], cT[1], cT[2]);
    doc.text("ALTURA", 28, 133);
    doc.text((pokemon.height / 10) + " m", 73, 133);
    doc.text("PESO", 28, 145);
    doc.text((pokemon.weight / 10) + " kg", 73, 145);

    /* Atributos */
    doc.setFont(fonte, "bold");
    doc.setTextColor(cTit[0], cTit[1], cTit[2]);
    doc.setFontSize(12);
    doc.text("ATRIBUTOS", 28, 158);

    var stats = pokemon.stats || [], y = 164, maximo = 0;
    for (i = 0; i < stats.length && i < 6; i++) maximo = Math.max(maximo, stats[i].base_stat);
    for (i = 0; i < stats.length && i < 6; i++) {
      var nome = stats[i].stat.name.replace("special-", "sp. ").toUpperCase();
      var valor = stats[i].base_stat;
      var largura = Math.min(118, (valor / Math.max(maximo, 100)) * 118);
      doc.setFontSize(8);
      doc.setFont(fonte, "bold");
      doc.setTextColor(cT[0], cT[1], cT[2]);
      doc.text(nome, 28, y);
      doc.setFillColor(236, 234, 243);
      doc.roundedRect(62, y - 4, 118, 5, 2, 2, "F");
      var barra = i % 2 === 0 ? cTit : cD;
      doc.setFillColor(barra[0], barra[1], barra[2]);
      doc.roundedRect(62, y - 4, largura, 5, 2, 2, "F");
      doc.setTextColor(cT[0], cT[1], cT[2]);
      doc.text(String(valor), 184, y);
      y += 14;
    }

    /* Frase exclusiva no rodapé */
    doc.setDrawColor(c2[0], c2[1], c2[2]);
    doc.setLineWidth(0.5);
    doc.line(28, 244, 182, 244);
    doc.setFont(fonte, "bold");
    doc.setFontSize(11);
    doc.setTextColor(cD[0], cD[1], cD[2]);
    doc.text('"' + estilo.frase + '"', 28, 252);
    doc.setFont(fonte, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140, 136, 158);
    doc.text("GERADO PELA POKÉDEX • " + new Date().toLocaleDateString("pt-BR") +
      " • ESTILO " + String(estilo.efeito).toUpperCase(), 28, 259);

    doc.save(pokemon.name + "-ficha-pokemon.pdf");
  }

  /* ------------------------------------------------------------------ */
  /* Word                                                                */
  /* ------------------------------------------------------------------ */
  var GLIFOS = {
    raios: "⚡", chamas: "🔥", bolhas: "◍", folhas: "❧", cristais: "◆", estrelas: "✦",
    nevoa: "❋", ondas: "〜", circuito: "▣", petalas: "✿", fragmentos: "▰", espinhos: "▲"
  };
  var FAMILIAS = { helvetica: "Arial, sans-serif", times: "'Times New Roman', serif", courier: "'Courier New', monospace" };

  /* Glifos com boa cobertura em fontes comuns (Windows, Android, iOS). */
  /* Aparece no rodapé das fichas: identifica qual build gerou o arquivo. */
  var VERSAO_GERADOR = "v8c23703";

  var GLIFOS_WORD = {
    raios: "\u2666", chamas: "\u25B2", bolhas: "\u25CB", folhas: "\u2663",
    cristais: "\u25C6", estrelas: "\u2605", nevoa: "\u25CC", ondas: "\u223C",
    circuito: "\u25A0", petalas: "\u2740", fragmentos: "\u25AC", espinhos: "\u25B4"
  };

  function faixaEfeito(efeito, cor, quantidade) {
    /* Vários glifos decorativos não existem nas fontes de celular e viram
       quadradinhos/bolinhas. Usamos apenas caracteres de cobertura ampla. */
    var g = GLIFOS_WORD[efeito] || "\u2022", linha = "", i;
    for (i = 0; i < quantidade; i++) linha += g + " ";
    return '<div style="color:' + cor + ';font-size:11pt;letter-spacing:4pt;line-height:1.2">' + linha + "</div>";
  }

  /* O .doc é um arquivo solto: uma <img> apontando para a internet aparece
     quebrada offline. Convertemos a arte em data URI para embutir no arquivo. */
  function arteEmbutida(url, pronto) {
    if (!url) { pronto(""); return; }
    /* Se a imagem não responder, o download não pode ficar travado:
       seguimos com a URL original depois de 6 segundos. */
    var respondeu = false;
    function terminar(valor) {
      if (respondeu) return;
      respondeu = true;
      pronto(valor);
    }
    setTimeout(function () { terminar(url); }, 6000);
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      try {
        var c = document.createElement("canvas");
        c.width = img.naturalWidth || 320;
        c.height = img.naturalHeight || 320;
        c.getContext("2d").drawImage(img, 0, 0);
        terminar(c.toDataURL("image/png"));
      } catch (e) { terminar(url); }
    };
    img.onerror = function () { terminar(url); };
    img.src = url;
  }

  /* Linha "rótulo: valor" da tabela de dados, com estilo inline. */
  function linhaInfo(rotulo, valor) {
    return '<tr><td style="padding:7px 14px;font-weight:bold;width:110px">' + rotulo +
      '</td><td style="padding:7px 14px">' + valor + "</td></tr>";
  }

  window.baixarFichaWord = function (botao) {
    var pokemon = window.atualPokemon && window.atualPokemon();
    if (!pokemon) { alert("Pesquise um Pokémon primeiro."); return; }

    var rotulo = botao && botao.innerHTML;
    if (botao) { botao.disabled = true; botao.innerHTML = "🎨 Criando estilo…"; }

    window.obterEstiloPokemon(pokemon, function (estilo) {
      var paleta = estilo.paleta, tipos = [], i;
      for (i = 0; i < pokemon.types.length; i++) tipos.push(pokemon.types[i].type.name);
      var familia = FAMILIAS[estilo.fonte] || FAMILIAS.helvetica;
      /* Mesmas cores sólidas do PDF: onde o texto é branco, o fundo precisa ser escuro. */
      var solidaPrim = fundoParaTextoBranco(paleta.primaria);
      /* A marca agora é uma faixa própria (não fica atrás do texto), então
         pode ter contraste real em vez de imitar transparência. */
      var corMarcaWord = misturar(solidaPrim, paleta.fundo, 0.55);
      var solidaSec = fundoParaTextoBranco(paleta.secundaria);
      var solidaDest = fundoParaTextoBranco(paleta.destaque);
      var tituloCapa = "\u26A1 Ficha Pok\u00E9mon";
      var arteOriginal = pokemon.sprites.other["official-artwork"].front_default || pokemon.sprites.front_default;
      arteEmbutida(arteOriginal, function (arteUrl) {
      var stats = pokemon.stats || [], linhas = "", maximo = 0;
      for (i = 0; i < stats.length && i < 6; i++) maximo = Math.max(maximo, stats[i].base_stat);
      for (i = 0; i < stats.length && i < 6; i++) {
        /* A proporção da barra vai em %, que foi o que o WPS respeitou; o
           width= em pixels da tabela aninhada saía todo do mesmo tamanho. */
        var pct = Math.max(3, Math.round((stats[i].base_stat / Math.max(maximo, 100)) * 100));
        var corBarra = i % 2 === 0 ? solidaPrim : solidaDest;
        linhas += '<tr><td style="padding:5px 10px;font-weight:bold;font-size:9pt;color:' + paleta.texto + '" width="120">' +
          stats[i].stat.name.replace("special-", "sp. ").toUpperCase() + "</td>" +
          '<td style="padding:5px 10px" width="320">' +
          '<table cellspacing="0" cellpadding="0" width="300" style="width:300px;background:#ecebf3;border-collapse:collapse"><tr>' +
          '<td width="' + pct + '%" bgcolor="' + corBarra + '" style="width:' + pct +
          '%;background:' + corBarra + ';height:12px;line-height:12px;font-size:1pt">&nbsp;</td>' +
          '<td bgcolor="#ecebf3" style="background:#ecebf3;height:12px;line-height:12px;font-size:1pt">&nbsp;</td>' +
          "</tr></table></td>" +
          '<td style="padding:5px 10px;color:' + solidaDest + ';font-weight:bold;font-size:9pt">' +
          stats[i].base_stat + "</td></tr>";
      }

      var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">' +
        '<head><meta charset="utf-8"><title>' + pokemon.name + "</title>" +
        "<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->" +
        "<style>@page{size:A4;margin:1.6cm}</style></head>" +
        /* Word e visualizadores como o WPS costumam descartar o <style> do
           cabeçalho: todo o visual precisa ir em style="" inline, e o layout
           em tabelas, que é o que esses programas renderizam de forma confiável. */
        '<body style="margin:0;font-family:' + familia + ";color:" + paleta.texto +
        ";background:" + paleta.fundo + '">' +
        '<table cellspacing="0" cellpadding="0" width="100%" style="width:100%;border-collapse:collapse">' +

        /* Capa */
        '<tr><td width="100%" bgcolor="' + solidaPrim + '" style="width:100%;background:' + solidaPrim +
        ";color:#ffffff;padding:20px 26px;border-bottom:6px solid " + paleta.secundaria + '">' +
        '<div style="font-size:21pt;font-weight:bold;color:#ffffff">' + tituloCapa + "</div>" +
        '<div style="font-size:10pt;letter-spacing:3px;margin-top:6px;color:#ffffff">' +
        estilo.titulo + "</div>" +
        faixaEfeito(estilo.efeito, "#ffffff", 18) +
        "</td></tr>" +

        /* Marca-d'água: no Word não há sobreposição confiável, então ela vira
           uma faixa própria em tom claro, logo abaixo da capa. */
        '<tr><td align="center" width="100%" style="width:100%;padding:12px 0 4px;color:' + corMarcaWord +
        ';font-size:30pt;font-weight:bold;letter-spacing:8pt;text-align:center">' +
        estilo.marca.texto + "</td></tr>" +

        /* Nome + arte */
        '<tr><td style="padding:0 26px">' +
        '<table cellspacing="0" cellpadding="0" width="100%"><tr>' +
        '<td valign="top" style="padding-top:6px">' +
        '<div style="font-size:20pt;font-weight:bold;color:' + solidaPrim + '">' +
        String(pokemon.name).toUpperCase() + "</div>" +
        '<div style="font-size:9pt;color:' + solidaDest + ';letter-spacing:2px;padding:2px 0 10px">Nº ' +
        ("0000" + pokemon.id).slice(-4) + " &#8226; FICHA DE TREINADOR</div>" +
        '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tr>' +
        '<td bgcolor="' + solidaSec + '" style="background:' + solidaSec +
        ';color:#ffffff;font-weight:bold;padding:7px 18px;letter-spacing:2pt;font-size:10pt">' +
        tipos.join(" &#8226; ").toUpperCase() + "</td></tr></table>" +
        "</td>" +
        (arteUrl.indexOf("data:") === 0
          ? '<td valign="top" width="170" align="right">' +
            '<img src="' + arteUrl + '" width="160" height="160" style="width:160px;height:160px" alt="' +
            pokemon.name + '"></td>'
          : "") +
        "</tr></table>" +
        '<div style="border-bottom:3px solid ' + paleta.secundaria + ';margin-top:14px"></div>' +
        "</td></tr>" +

        /* Dados principais */
        '<tr><td style="padding:18px 26px 0">' +
        '<div style="color:' + solidaPrim + ';font-size:10pt;font-weight:bold;letter-spacing:2px;padding-bottom:6px">DADOS PRINCIPAIS</div>' +
        '<table cellspacing="0" cellpadding="0" width="100%" style="border:1px solid ' + paleta.secundaria +
        ';background:#ffffff">' +
        linhaInfo("Número", "#" + ("0000" + pokemon.id).slice(-4)) +
        linhaInfo("Tipos", tipos.join(", ")) +
        linhaInfo("Altura", (pokemon.height / 10) + " m") +
        linhaInfo("Peso", (pokemon.weight / 10) + " kg") +
        "</table></td></tr>" +

        /* Atributos */
        '<tr><td style="padding:20px 26px 0">' +
        '<div style="color:' + solidaPrim + ';font-size:10pt;font-weight:bold;letter-spacing:2px;padding-bottom:6px">ATRIBUTOS</div>' +
        '<table cellspacing="0" cellpadding="0" width="100%">' + linhas + "</table>" +
        "</td></tr>" +

        /* Rodapé */
        '<tr><td style="padding:22px 26px 26px">' +
        faixaEfeito(estilo.efeito, solidaSec, 22) +
        '<div style="color:' + solidaDest + ";font-size:11pt;font-style:italic;font-weight:bold;border-left:5px solid " +
        paleta.secundaria + ';padding:8px 14px;margin-top:10px">&#8220;' + estilo.frase + "&#8221;</div>" +
        '<div style="margin-top:12px;color:#77718f;font-size:8pt">Gerado pela Pokédex &#8226; ' +
        new Date().toLocaleDateString("pt-BR") + " &#8226; estilo exclusivo (" + estilo.efeito +
        ") criado por IA. " + VERSAO_GERADOR + "</div>" +
        "</td></tr>" +

        "</table></body></html>";

      var blob = new Blob(["\ufeff", html], { type: "application/msword" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = pokemon.name + "-ficha-pokemon.doc";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      if (botao) { botao.disabled = false; botao.innerHTML = rotulo; }
      });
    });
  };

  /* ------------------------------------------------------------------ */
  /* Prévia do estilo na própria página                                  */
  /* ------------------------------------------------------------------ */
  window.mostrarEstiloNaPagina = function (pokemon) {
    var caixa = document.getElementById("estiloFicha");
    if (!caixa) return;
    caixa.innerHTML = '<small style="color:#8582a5">🎨 Analisando este Pokémon com IA…</small>';
    window.obterEstiloPokemon(pokemon, function (estilo) {
      var alvo = document.getElementById("estiloFicha");
      if (!alvo) return;
      var p = estilo.paleta;
      function bolinha(cor) {
        return '<span style="display:inline-block;width:15px;height:15px;border-radius:50%;background:' +
          cor + ';border:2px solid #fff;box-shadow:0 1px 4px #0003;vertical-align:middle"></span> ';
      }
      alvo.innerHTML = '<div style="margin-top:12px;padding:10px 14px;border-radius:14px;background:' + p.fundo +
        ";border-left:5px solid " + p.primaria + '">' +
        '<strong style="color:' + p.primaria + ';font-size:13px;letter-spacing:1px">' + estilo.titulo + "</strong>" +
        '<div style="margin:6px 0">' + bolinha(p.primaria) + bolinha(p.secundaria) + bolinha(p.destaque) +
        '<span style="font-size:12px;color:' + p.texto + '"> efeito: ' + estilo.efeito +
        " • marca: " + estilo.marca.texto + "</span></div>" +
        '<em style="font-size:12px;color:' + p.destaque + '">“' + estilo.frase + "”</em></div>";
    });
  };
}());
