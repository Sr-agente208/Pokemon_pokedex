const {
Document,
Packer,
Paragraph,
ImageRun
}=docx;


async function gerarWord(pokemon){

const doc = new Document({

sections:[{

children:[

new Paragraph({
text:
`Ficha Pokémon - ${pokemon.name.toUpperCase()}`
}),


new Paragraph({
text:
`
Número: #${pokemon.id}

Tipo:
${pokemon.types}

Peso:
${pokemon.weight}

Altura:
${pokemon.height}
`
})

]

}]

});


const blob =
await Packer.toBlob(doc);


saveAs(
blob,
`${pokemon.name}.docx`
);

}