1. Criar a pasta do material dentro de `content/videos/`, usando o identificador em inglês
2. Copiar os quatro vídeos para dentro dela, nomeados 1.mp4, 2.mp4, 3.mp4 e 4.mp4
3. Copiar a imagem do card para `content/images/`
4. Abrir o `content/materials.json` e acrescentar o bloco do material novo
5. Rodar a validação e conferir que não há erro
6. Reiniciar o sistema

Modelo de bloco de material:

"
{
"id": "steel",
"name": "Aço",
"tagline": "Tudo começa na natureza",
"description": "Do minério de ferro às cidades: o aço está nas pontes, nos prédios, nos carros e em quase tudo ao seu redor.",
"color": "#26215C",
"cardImage": "images/steel.jpg",
"order": 1,
"enabled": false,
"videos": [
{ "stage": 1, "duration": 75.0 },
{ "stage": 2, "duration": 80.0 },
{ "stage": 3, "duration": 90.0 },
{ "stage": 4, "duration": 80.0 }
]
},
"
