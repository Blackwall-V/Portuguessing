/* Contenido: frases por profesión.
 *
 * Cada frase:  p(cat, es, f, i, pt, opts)
 *   cat   categoría (ver CATS)
 *   es    español; string o [formal, informal]
 *   f     portugués formal (Brasil)
 *   i     portugués informal (Brasil); null = igual que el formal
 *   pt    ajustes para Portugal: string (sirve para ambos) o {f, i}
 *   opts  { hear: true }  → frase que te dicen a ti (no depende de formalidad)
 *         { when: ['morning'|'afternoon'|'night'] } → solo en ese momento del día
 *
 * Marcas: {Sd} Bom dia/Boa tarde/Boa noite · {umbom} · {sr}/{Sr} o senhor/a senhora
 *         {bv} bem-vindo/a · {obg}/{Obg} obrigado/a · {moeda} reais/euros
 *         {esd} {esumbuen} {esbv} {mes} → versión en español.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PGDATA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CATS = {
    saludo: { label: 'Saludar', icon: '👋' },
    preguntar: { label: 'Preguntar', icon: '❓' },
    informar: { label: 'Informar', icon: 'ℹ️' },
    precio: { label: 'Precio y pago', icon: '💶' },
    indicar: { label: 'Indicaciones', icon: '📌' },
    problema: { label: 'Problemas', icon: '⚠️' },
    cortesia: { label: 'Cortesía', icon: '🤝' },
    basico: { label: 'Básico', icon: '🔤' },
    despedida: { label: 'Despedirse', icon: '🙋' },
    hear: { label: 'Te pueden decir', icon: '👂' },
  };

  function mk(prefix) {
    let n = 0;
    return function p(cat, es, f, i, pt, opts) {
      n += 1;
      const ph = { id: prefix + '-' + n, cat, es, f };
      if (i != null) ph.i = i;
      if (pt != null) ph.p = typeof pt === 'string' ? { f: pt } : pt;
      if (opts) Object.assign(ph, opts);
      if (cat === 'hear') ph.hear = true;
      return ph;
    };
  }

  /* ---------------- Esencial ---------------- */
  const pe = mk('esencial');
  const esencial = [
    pe('saludo', '{esd}.', '{Sd}.', '{Sd}!'),
    pe('saludo', 'Hola.', 'Olá.', 'Oi!', { f: 'Olá.', i: 'Olá!' }),
    pe('saludo', ['¿Cómo está usted?', '¿Cómo estás?'], 'Como {sr} está?', 'Tudo bem?',
      { f: 'Como está?', i: 'Tudo bem?' }),
    pe('saludo', 'Mucho gusto.', 'Muito prazer.', 'Prazer!'),
    pe('cortesia', 'Por favor.', 'Por favor.'),
    pe('cortesia', 'Gracias.', 'Muito {obg}.', '{Obg}!'),
    pe('cortesia', 'De nada.', 'De nada.', 'De nada!'),
    pe('cortesia', 'Disculpe (para pasar o llamar la atención).', 'Com licença.', 'Com licença!'),
    pe('cortesia', 'Perdón, lo siento.', 'Desculpe.', 'Desculpa!'),
    pe('basico', 'No entiendo.', 'Desculpe, não entendi.', 'Não entendi.',
      { f: 'Desculpe, não percebi.', i: 'Não percebi.' }),
    pe('basico', ['¿Puede repetir, por favor?', '¿Puedes repetir, por favor?'],
      '{Sr} pode repetir, por favor?', 'Pode repetir, por favor?',
      { f: 'Pode repetir, por favor?', i: 'Podes repetir, por favor?' }),
    pe('basico', ['Hable más despacio, por favor.', 'Habla más despacio, por favor.'],
      'Fale mais devagar, por favor.', 'Fala mais devagar, por favor.'),
    pe('basico', 'Estoy aprendiendo portugués.', 'Estou aprendendo português.', null,
      'Estou a aprender português.'),
    pe('basico', ['¿Habla inglés?', '¿Hablas inglés?'], '{Sr} fala inglês?', 'Você fala inglês?',
      { f: 'Fala inglês?', i: 'Falas inglês?' }),
    pe('basico', '¿Cómo se dice … en portugués?', 'Como se diz … em português?'),
    pe('basico', 'Sí. No. Tal vez.', 'Sim. Não. Talvez.'),
    pe('basico', '¿Qué hora es?', 'Que horas são?'),
    pe('basico', 'Números del 1 al 10.',
      'Um, dois, três, quatro, cinco, seis, sete, oito, nove, dez.'),
    pe('basico', 'Días de la semana.',
      'Segunda, terça, quarta, quinta, sexta, sábado, domingo.'),
    pe('despedida', 'Hasta luego.', 'Até logo.', 'Até mais!', { f: 'Até logo.', i: 'Até logo!' }),
    pe('despedida', 'Que tenga {esumbuen}.', 'Tenha {umbom}!', '{Sd}! Até logo!'),
  ];

  /* ---------------- Tienda / atención al público ---------------- */
  const pc = mk('tienda');
  const tienda = [
    pc('saludo', '{esd}, {esbv}. ¿En qué puedo ayudarle?', '{Sd}, {bv}! Em que posso ajudar?',
      '{Sd}! Posso te ajudar?', { f: '{Sd}, {bv}! Em que posso ajudar?', i: '{Sd}! Posso ajudar-te?' }),
    pc('preguntar', ['¿Qué necesita?', '¿Qué necesitas?'], 'O que {sr} deseja?',
      'O que você precisa?', { f: 'O que deseja?', i: 'O que precisas?' }),
    pc('preguntar', ['¿Busca algo en particular?', '¿Buscas algo en particular?'],
      '{Sr} procura algo em especial?', 'Você está procurando algo em especial?',
      { f: 'Procura algo em especial?', i: 'Procuras algo em especial?' }),
    pc('informar', 'Un momento, por favor.', 'Um momento, por favor.', 'Só um minutinho.',
      { f: 'Um momento, por favor.', i: 'Só um minuto.' }),
    pc('informar', 'Voy a comprobar si hay en stock.', 'Vou verificar se temos em estoque.',
      'Vou ver se tem em estoque.', { f: 'Vou verificar se temos em stock.', i: 'Vou ver se temos em stock.' }),
    pc('precio', 'Cuesta veinticinco {mes}.', 'Custa vinte e cinco {moeda}.'),
    pc('precio', 'El total es de cuarenta {mes}.', 'O total é de quarenta {moeda}.'),
    pc('informar', 'No lo vendemos.', 'Não vendemos isso.', 'A gente não vende isso.',
      { f: 'Não vendemos isso.', i: 'Não vendemos isso.' }),
    pc('problema', 'No lo tenemos. Se agotó.', 'Não temos esse item. Está esgotado.',
      'Não tem mais. Acabou.', { f: 'Não temos esse artigo. Está esgotado.', i: 'Já não temos. Esgotou.' }),
    pc('precio', 'Solo aceptamos efectivo.', 'Só aceitamos dinheiro.'),
    pc('precio', '¿Débito o crédito?', 'Débito ou crédito?'),
    pc('precio', ['¿Desea factura con su número fiscal?', '¿Quieres factura con tu número fiscal?'],
      '{Sr} quer CPF na nota?', 'Quer CPF na nota?',
      { f: 'Deseja fatura com número de contribuinte?', i: 'Queres fatura com número de contribuinte?' }),
    pc('preguntar', ['¿Qué talla usa?', '¿Qué talla usas?'], 'Que tamanho {sr} usa?',
      'Que tamanho você usa?', { f: 'Que tamanho usa?', i: 'Que tamanho usas?' }),
    pc('informar', ['Puede probárselo en el probador.', 'Puedes probártelo en el probador.'],
      '{Sr} pode experimentar no provador.', 'Pode experimentar no provador.',
      { f: 'Pode experimentar no provador.', i: 'Podes experimentar no provador.' }),
    pc('preguntar', ['¿Desea una bolsa?', '¿Quieres una bolsa?'], '{Sr} quer sacola?',
      'Quer sacola?', { f: 'Deseja um saco?', i: 'Queres um saco?' }),
    pc('informar', 'No hacemos devoluciones, solo cambios.',
      'Não fazemos devolução, apenas troca.', null,
      'Não fazemos devoluções, apenas trocas.'),
    pc('informar', 'Abrimos a las nueve y cerramos a las ocho de la noche.',
      'Abrimos às nove da manhã e fechamos às oito da noite.'),
    pc('despedida', 'Gracias por su compra. ¡Vuelva pronto!', 'Muito {obg} pela compra. Volte sempre!',
      '{Obg} pela compra! Volta logo!', { f: 'Muito {obg} pela compra. Volte sempre!', i: '{Obg} pela compra! Volta sempre!' }),
    pc('despedida', 'Que tenga {esumbuen}.', 'Tenha {umbom}!', 'Até logo, {sd}!'),
    pc('hear', '¿Cuánto cuesta esto?', 'Quanto custa isto?'),
    pc('hear', '¿Tienen otro color?', 'Vocês têm em outra cor?', null, 'Têm noutra cor?'),
    pc('hear', '¿Hacen descuento?', 'Tem desconto?'),
    pc('hear', '¿Puedo pagar con tarjeta?', 'Posso pagar com cartão?'),
    pc('hear', '¿Dónde está el baño?', 'Onde fica o banheiro?', null, 'Onde fica a casa de banho?'),
  ];

  /* ---------------- Restaurante / café ---------------- */
  const pr = mk('restaurante');
  const restaurante = [
    pr('saludo', '{esd}, {esbv}. ¿Mesa para cuántas personas?', '{Sd}, {bv}! Mesa para quantas pessoas?',
      '{Sd}! Mesa pra quantas pessoas?', { f: '{Sd}, {bv}! Mesa para quantas pessoas?', i: '{Sd}! Mesa para quantas pessoas?' }),
    pr('preguntar', ['¿Prefiere dentro o en la terraza?', '¿Prefieres dentro o en la terraza?'],
      '{Sr} prefere ficar dentro ou na área externa?', 'Você prefere ficar dentro ou fora?',
      { f: 'Prefere ficar no interior ou na esplanada?', i: 'Preferes ficar dentro ou na esplanada?' }),
    pr('informar', 'Aquí tiene la carta.', 'Aqui está o cardápio.', null, 'Aqui está a ementa.'),
    pr('preguntar', ['¿Desea algo de beber?', '¿Quieres algo de beber?'], '{Sr} deseja algo para beber?',
      'Quer algo pra beber?', { f: 'Deseja alguma coisa para beber?', i: 'Queres alguma coisa para beber?' }),
    pr('preguntar', ['¿Ya ha elegido?', '¿Ya elegiste?'], '{Sr} já escolheu?', 'Já escolheu?',
      { f: 'Já escolheu?', i: 'Já escolheste?' }),
    pr('informar', 'Le recomiendo el plato del día.', 'Recomendo o prato do dia.', 'Recomendo o prato do dia!'),
    pr('preguntar', ['¿Tiene alguna alergia o intolerancia?', '¿Tienes alguna alergia?'],
      '{Sr} tem alguma alergia ou restrição alimentar?', 'Você tem alguma alergia?',
      { f: 'Tem alguma alergia ou intolerância alimentar?', i: 'Tens alguma alergia?' }),
    pr('preguntar', ['¿Cómo prefiere la carne: poco hecha, al punto o muy hecha?', '¿Cómo quieres la carne?'],
      'Como {sr} prefere a carne: mal passada, ao ponto ou bem passada?', 'Como você quer a carne?',
      { f: 'Como prefere a carne: mal passada, no ponto ou bem passada?', i: 'Como queres a carne?' }),
    pr('informar', 'Enseguida se lo traigo.', 'Já estou trazendo.', 'Já trago!', 'Já trago.'),
    pr('preguntar', '¿Todo bien con la comida?', 'Está tudo bem com o prato?',
      'Tá tudo bem com a comida?', { f: 'Está tudo bem com o prato?', i: 'Está tudo bem com a comida?' }),
    pr('preguntar', ['¿Desea postre o café?', '¿Quieres postre o café?'], '{Sr} deseja sobremesa ou café?',
      'Quer sobremesa ou café?', { f: 'Deseja sobremesa ou café?', i: 'Queres sobremesa ou café?' }),
    pr('precio', ['¿Desea la cuenta?', '¿Quieres la cuenta?'], '{Sr} deseja a conta?', 'Quer a conta?',
      { f: 'Deseja a conta?', i: 'Queres a conta?' }),
    pr('precio', '¿Paga todo junto o por separado?', 'Vai pagar tudo junto ou separado?',
      'Vai ser junto ou separado?', { f: 'Vai pagar tudo junto ou separado?', i: 'Vai ser junto ou separado?' }),
    pr('precio', 'El servicio no está incluido.', 'A gorjeta não está inclusa.', null,
      'A gorjeta não está incluída.'),
    pr('problema', 'Lo sentimos, ese plato se agotó.', 'Sinto muito, esse prato acabou.', 'Desculpa, esse prato acabou.',
      { f: 'Lamento, esse prato esgotou.', i: 'Desculpa, esse prato esgotou.' }),
    pr('preguntar', ['¿Desea desayunar?', '¿Quieres desayunar?'], '{Sr} deseja tomar café da manhã?',
      'Quer tomar café da manhã?', { f: 'Deseja tomar o pequeno-almoço?', i: 'Queres tomar o pequeno-almoço?' },
      { when: ['morning'] }),
    pr('preguntar', ['¿Desea ver el menú del almuerzo?', '¿Quieres ver el menú del almuerzo?'],
      '{Sr} deseja ver o cardápio do almoço?', 'Quer ver o cardápio do almoço?',
      { f: 'Deseja ver a ementa de almoço?', i: 'Queres ver a ementa de almoço?' }, { when: ['afternoon'] }),
    pr('preguntar', ['¿Desea cenar?', '¿Quieres cenar?'], '{Sr} deseja jantar?', 'Vai jantar com a gente?',
      { f: 'Deseja jantar?', i: 'Vais jantar connosco?' }, { when: ['night'] }),
    pr('despedida', 'Gracias, ¡que tenga {esumbuen}!', 'Muito {obg}! Tenha {umbom}!', '{Obg}! {Sd}!'),
    pr('hear', 'Una mesa para dos, por favor.', 'Uma mesa para duas pessoas, por favor.'),
    pr('hear', '¿Qué lleva este plato?', 'O que tem neste prato?'),
    pr('hear', 'La cuenta, por favor.', 'A conta, por favor.'),
    pr('hear', 'Soy alérgico a los frutos secos.', 'Sou alérgico a frutos secos.', null,
      'Sou alérgico a frutos secos.'),
  ];

  /* ---------------- Hotel / recepción ---------------- */
  const ph = mk('hotel');
  const hotel = [
    ph('saludo', '{esd}, {esbv} al hotel.', '{Sd}, {bv} ao hotel.', '{Sd}! Seja {bv}!'),
    ph('preguntar', ['¿Tiene una reserva?', '¿Tienes una reserva?'], '{Sr} tem reserva?', 'Você tem reserva?',
      { f: 'Tem reserva?', i: 'Tens reserva?' }),
    ph('preguntar', '¿A nombre de quién?', 'Em nome de quem?'),
    ph('preguntar', ['¿Cuántas noches se queda?', '¿Cuántas noches te quedas?'],
      'Quantas noites {sr} vai ficar?', 'Quantas noites você vai ficar?',
      { f: 'Quantas noites vai ficar?', i: 'Quantas noites vais ficar?' }),
    ph('informar', 'Su pasaporte o documento, por favor.', 'Seu passaporte ou documento, por favor.',
      'Me passa seu documento, por favor?', { f: 'O seu passaporte ou documento, por favor.', i: 'Dás-me o teu documento, por favor?' }),
    ph('informar', 'Aquí tiene su llave.', 'Aqui está a sua chave.', null, 'Aqui está o seu cartão-chave.'),
    ph('informar', 'Su habitación es la 305, en el tercer piso.', 'O quarto é o 305, no terceiro andar.', null,
      'O quarto é o 305, no terceiro piso.'),
    ph('informar', 'El desayuno se sirve de 7 a 10.', 'O café da manhã é servido das 7h às 10h.', null,
      'O pequeno-almoço é servido das 7h às 10h.'),
    ph('informar', 'La contraseña del wifi es …', 'A senha do wi-fi é …', null, 'A palavra-passe do wi-fi é …'),
    ph('informar', 'El check-out es hasta el mediodía.', 'O check-out é até o meio-dia.', null,
      'O check-out é até ao meio-dia.'),
    ph('preguntar', ['¿Le ayudo con el equipaje?', '¿Te ayudo con el equipaje?'],
      'Posso ajudar {sr} com a bagagem?', 'Posso te ajudar com a bagagem?',
      { f: 'Posso ajudar com a bagagem?', i: 'Ajudo-te com a bagagem?' }),
    ph('preguntar', ['¿Desea que le llame un taxi?', '¿Quieres que te llame un taxi?'],
      '{Sr} deseja que eu chame um táxi?', 'Quer que eu chame um táxi?',
      { f: 'Deseja que eu chame um táxi?', i: 'Queres que eu chame um táxi?' }),
    ph('problema', 'Lo sentimos, no tenemos habitaciones disponibles.',
      'Sinto muito, não temos quartos disponíveis.'),
    ph('informar', 'Un momento, voy a comprobarlo.', 'Um momento, vou verificar.'),
    ph('despedida', 'Esperamos que disfrute su estancia.', 'Desejamos uma ótima estadia.',
      'Aproveite a estadia!', { f: 'Desejamos uma ótima estadia.', i: 'Aproveita a estadia!' }),
    ph('hear', 'Tengo una reserva a nombre de …', 'Tenho uma reserva em nome de …'),
    ph('hear', '¿A qué hora es el desayuno?', 'A que horas é o café da manhã?', null,
      'A que horas é o pequeno-almoço?'),
    ph('hear', 'El aire acondicionado no funciona.', 'O ar-condicionado não funciona.', null,
      'O ar condicionado não funciona.'),
    ph('hear', '¿Puedo dejar el equipaje aquí?', 'Posso deixar a bagagem aqui?'),
  ];

  /* ---------------- Salud / farmacia ---------------- */
  const ps = mk('salud');
  const salud = [
    ps('saludo', '{esd}. ¿En qué puedo ayudarle?', '{Sd}. Em que posso ajudar?', '{Sd}! Posso te ajudar?',
      { f: '{Sd}. Em que posso ajudar?', i: '{Sd}! Posso ajudar-te?' }),
    ps('preguntar', ['¿Qué síntomas tiene?', '¿Qué sientes?'], 'O que {sr} está sentindo?',
      'O que você está sentindo?', { f: 'O que está a sentir?', i: 'O que estás a sentir?' }),
    ps('preguntar', '¿Dónde le duele?', 'Onde dói?'),
    ps('preguntar', ['¿Desde cuándo tiene estos síntomas?', '¿Desde cuándo tienes esto?'],
      'Desde quando {sr} tem esses sintomas?', 'Desde quando você tem isso?',
      { f: 'Desde quando tem estes sintomas?', i: 'Desde quando tens isto?' }),
    ps('preguntar', ['¿Tiene alergia a algún medicamento?', '¿Tienes alergia a algún medicamento?'],
      '{Sr} tem alergia a algum medicamento?', 'Você tem alergia a algum remédio?',
      { f: 'Tem alergia a algum medicamento?', i: 'Tens alergia a algum medicamento?' }),
    ps('preguntar', ['¿Tiene receta médica?', '¿Tienes receta?'], '{Sr} tem receita médica?', 'Você tem receita?',
      { f: 'Tem receita médica?', i: 'Tens receita?' }),
    ps('informar', 'Este medicamento requiere receta.', 'Este medicamento só é vendido com receita.'),
    ps('indicar', ['Tome una pastilla cada ocho horas.', 'Toma una pastilla cada ocho horas.'],
      'Tome um comprimido a cada oito horas.', 'Toma um comprimido a cada oito horas.',
      { f: 'Tome um comprimido de oito em oito horas.', i: 'Toma um comprimido de oito em oito horas.' }),
    ps('indicar', 'Tómelo después de las comidas.', 'Tome depois das refeições.', 'Toma depois de comer.',
      { f: 'Tome depois das refeições.', i: 'Toma depois das refeições.' }),
    ps('indicar', ['Tómelo con abundante agua.', 'Tómalo con mucha agua.'],
      'Tome com bastante água.', 'Toma com bastante água.'),
    ps('indicar', ['Respire hondo.', 'Respira hondo.'], 'Respire fundo.', 'Respira fundo.'),
    ps('indicar', ['Necesita descansar y beber mucho líquido.', 'Necesitas descansar y beber mucha agua.'],
      '{Sr} precisa descansar e beber bastante líquido.', 'Você precisa descansar e beber bastante água.',
      { f: 'Precisa de descansar e beber muitos líquidos.', i: 'Precisas de descansar e beber muita água.' }),
    ps('informar', 'Voy a tomarle la temperatura.', 'Vou medir a sua temperatura.', 'Vou medir sua temperatura.',
      { f: 'Vou medir-lhe a temperatura.', i: 'Vou medir-te a temperatura.' }),
    ps('indicar', ['Si empeora, vuelva o vaya a urgencias.', 'Si empeora, vuelve o ve a urgencias.'],
      'Se piorar, volte ou procure o pronto-socorro.', 'Se piorar, volta ou vai ao pronto-socorro.',
      { f: 'Se piorar, volte ou dirija-se às urgências.', i: 'Se piorar, volta ou vai às urgências.' }),
    ps('problema', 'Voy a llamar a una ambulancia.', 'Vou chamar uma ambulância.'),
    ps('despedida', 'Que se mejore pronto.', 'Melhoras!', 'Melhoras!', 'As melhoras!'),
    ps('hear', 'Me duele la cabeza.', 'Estou com dor de cabeça.', null, 'Tenho dor de cabeça.'),
    ps('hear', 'Necesito algo para la fiebre.', 'Preciso de algo para a febre.'),
    ps('hear', 'Soy alérgico a la penicilina.', 'Sou alérgico à penicilina.'),
    ps('hear', 'No me siento bien.', 'Não estou me sentindo bem.', null, 'Não me sinto bem.'),
    ps('hear', '¿Tienen algo sin receta para el dolor?', 'Vocês têm algo sem receita para dor?', null,
      'Têm algo sem receita para as dores?'),
  ];

  /* ---------------- Transporte / taxi ---------------- */
  const pt_ = mk('transporte');
  const transporte = [
    pt_('saludo', '{esd}. ¿A dónde va?', '{Sd}! Para onde {sr} vai?', '{Sd}! Pra onde você vai?',
      { f: '{Sd}! Para onde vai?', i: '{Sd}! Para onde vais?' }),
    pt_('preguntar', ['¿Me da la dirección, por favor?', '¿Me pasas la dirección?'],
      '{Sr} pode me dar o endereço, por favor?', 'Me passa o endereço?',
      { f: 'Pode dar-me a morada, por favor?', i: 'Dás-me a morada?' }),
    pt_('informar', 'El viaje dura unos veinte minutos.', 'A viagem leva uns vinte minutos.'),
    pt_('precio', 'El precio aproximado es de treinta {mes}.', 'O valor aproximado é de trinta {moeda}.'),
    pt_('indicar', ['Abróchese el cinturón, por favor.', 'Abróchate el cinturón, por favor.'],
      'Coloque o cinto de segurança, por favor.', 'Coloca o cinto, por favor.',
      { f: 'Ponha o cinto de segurança, por favor.', i: 'Põe o cinto, por favor.' }),
    pt_('preguntar', ['¿Está bien el aire acondicionado?', '¿Está bien el aire?'],
      'O ar-condicionado está bom?', 'O ar tá bom pra você?',
      { f: 'O ar condicionado está bem?', i: 'O ar condicionado está bem para ti?' }),
    pt_('informar', 'Hay mucho tráfico.', 'Tem muito trânsito.', 'Tá cheio de trânsito hoje.',
      { f: 'Há muito trânsito.', i: 'Há muito trânsito hoje.' }),
    pt_('informar', 'Faltan cinco minutos.', 'Faltam cinco minutos.'),
    pt_('informar', 'Hemos llegado.', 'Chegamos.'),
    pt_('precio', ['¿Paga en efectivo o con tarjeta?', '¿Pagas en efectivo o con tarjeta?'],
      '{Sr} vai pagar em dinheiro ou no cartão?', 'Vai pagar em dinheiro ou no cartão?',
      { f: 'Vai pagar em dinheiro ou com cartão?', i: 'Vais pagar em dinheiro ou com cartão?' }),
    pt_('problema', 'No tengo cambio.', 'Não tenho troco.'),
    pt_('preguntar', ['¿Quiere ayuda con las maletas?', '¿Quieres ayuda con las maletas?'],
      '{Sr} quer ajuda com as malas?', 'Quer ajuda com as malas?',
      { f: 'Quer ajuda com as malas?', i: 'Queres ajuda com as malas?' }),
    pt_('informar', 'Aquí tiene su recibo.', 'Aqui está o seu recibo.'),
    pt_('indicar', ['Tenga cuidado al bajar.', 'Ten cuidado al bajar.'], 'Cuidado ao descer.', 'Cuidado ao descer!'),
    pt_('despedida', 'Gracias. ¡Que tenga {esumbuen}!', 'Muito {obg}! Tenha {umbom}!', '{Obg}! {Sd}!'),
    pt_('hear', 'Al aeropuerto, por favor.', 'Para o aeroporto, por favor.'),
    pt_('hear', '¿Cuánto cuesta hasta el centro?', 'Quanto custa até o centro?', null, 'Quanto custa até ao centro?'),
    pt_('hear', 'Pare aquí, por favor.', 'Pare aqui, por favor.'),
    pt_('hear', 'Tengo prisa.', 'Estou com pressa.', null, 'Tenho pressa.'),
    pt_('hear', '¿Puede esperar un momento?', 'Pode esperar um momento?'),
  ];

  /* ---------------- Oficina / atención telefónica ---------------- */
  const po = mk('oficina');
  const oficina = [
    po('saludo', '{esd}, empresa X, ¿en qué puedo ayudarle?', '{Sd}, empresa X, em que posso ajudar?',
      '{Sd}! Empresa X, tudo bem?', { f: '{Sd}, empresa X, em que posso ajudar?', i: '{Sd}! Empresa X, diga!' }),
    po('informar', 'Un momento, le paso la llamada.', 'Um momento, vou transferir a ligação.', null,
      'Um momento, vou passar a chamada.'),
    po('problema', 'La persona no está disponible ahora.', 'A pessoa não está disponível no momento.'),
    po('preguntar', ['¿Desea dejar un mensaje?', '¿Quieres dejar un mensaje?'],
      '{Sr} gostaria de deixar recado?', 'Quer deixar recado?',
      { f: 'Gostaria de deixar recado?', i: 'Queres deixar recado?' }),
    po('preguntar', ['¿Me puede dar su nombre y teléfono?', '¿Me das tu nombre y teléfono?'],
      '{Sr} pode me informar o nome e o telefone?', 'Qual o seu nome e telefone?',
      { f: 'Pode informar-me o nome e o contacto?', i: 'Qual é o teu nome e contacto?' }),
    po('informar', 'Le devolveremos la llamada.', 'Retornaremos a ligação.', 'A gente retorna a ligação.',
      { f: 'Devolveremos a chamada.', i: 'Devolvemos-te a chamada.' }),
    po('informar', 'Voy a enviarle un correo.', 'Vou enviar um e-mail.', null, 'Vou enviar-lhe um e-mail.'),
    po('preguntar', ['¿Podemos agendar una reunión?', '¿Agendamos una reunión?'],
      'Podemos agendar uma reunião?', 'Vamos agendar uma reunião?',
      { f: 'Podemos marcar uma reunião?', i: 'Vamos marcar uma reunião?' }),
    po('informar', 'La reunión es a las diez.', 'A reunião é às dez horas.'),
    po('informar', 'Adjunto el documento.', 'Segue em anexo o documento.'),
    po('cortesia', 'Disculpe el retraso.', 'Desculpe o atraso.', 'Desculpa o atraso!'),
    po('cortesia', 'Le agradezco su paciencia.', 'Agradeço a sua paciência.', 'Valeu pela paciência!',
      { f: 'Agradeço a sua paciência.', i: 'Obrigado pela paciência!' }),
    po('despedida', 'Quedo a su disposición.', 'Fico à disposição.', 'Qualquer coisa, é só falar!',
      { f: 'Fico à sua disposição.', i: 'Qualquer coisa, diz!' }),
    po('despedida', 'Atentamente (cierre de email).', 'Atenciosamente,', 'Abraço,',
      { f: 'Com os melhores cumprimentos,', i: 'Cumprimentos,' }),
    po('hear', 'Quisiera hablar con la señora García.', 'Gostaria de falar com a senhora García.'),
    po('hear', '¿Cuál es el plazo de entrega?', 'Qual é o prazo de entrega?'),
    po('hear', '¿Puede enviarme el presupuesto?', 'Pode me enviar o orçamento?', null,
      'Pode enviar-me o orçamento?'),
  ];

  const decks = [
    { id: 'esencial', icon: '👋', name: 'Esencial', desc: 'Saludos, cortesía y lo básico', phrases: esencial },
    { id: 'tienda', icon: '🛍️', name: 'Tienda', desc: 'Atención al público y caja', phrases: tienda },
    { id: 'restaurante', icon: '🍽️', name: 'Restaurante', desc: 'Camarero, café y bar', phrases: restaurante },
    { id: 'hotel', icon: '🏨', name: 'Hotel', desc: 'Recepción y huéspedes', phrases: hotel },
    { id: 'salud', icon: '💊', name: 'Salud', desc: 'Farmacia y consulta (uso educativo)', phrases: salud },
    { id: 'transporte', icon: '🚕', name: 'Transporte', desc: 'Taxi, conductor y viajeros', phrases: transporte },
    { id: 'oficina', icon: '💼', name: 'Oficina', desc: 'Teléfono, correo y reuniones', phrases: oficina },
  ];

  return { CATS, decks };
});
