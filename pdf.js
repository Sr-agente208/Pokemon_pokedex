const { jsPDF } = window.jspdf;

function gerarPDF(pokemon){

const pdf = new jsPDF();

pdf.setFontSize(22);
pdf.text(
`Ficha Pokémon: ${pokemon.name.toUpperCase()}`,
20,
30
);


pdf.addImage(
pokemon.image,
"PNG",
60,
40,
90,
90
);


pdf.setFontSize(14);

pdf.text(
`
Número: #${pokemon.id}

Tipo: ${pokemon.types}

Altura: ${pokemon.height}

Peso: ${pokemon.weight}

Habilidades:
${pokemon.abilities}
`,
20,
150
);


pdf.save(
`${pokemon.name}-ficha.pdf`
);

}