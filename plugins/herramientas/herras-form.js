let handler = async (m, { conn }) => {
  try {
    const txt = `*Encuesta*
Estimado cliente KFG, por favor responda la encuesta.`;

    const msg = {
      body: txt,
      footer: "",
      nativeFlowMessage: {
        buttons: [
            {
    name: "galaxy_message",
    buttonParamsJson: "{\"flow_message_version\":\"3\",\"flow_token\":\"{\\\"ticket_id\\\":\\\"1594484278500636\\\"}\",\"flow_id\":\"1898584297721174\",\"flow_cta\":\"Ver Ticket\",\"flow_action\":\"navigate\",\"flow_action_payload\":{\"screen\":\"SATISFACTION_SCREEN\",\"data\":{\"serializedJson\":\"{\\\"title\\\":\\\"Mira el Ticket\\\",\\\"continue_label\\\":\\\"Continuar\\\",\\\"satisfaction_screen_question\\\":\\\"\\\\u00bfEst\\\\u00e1s satisfecho o insatisfecho con la experiencia de atenci\\\\u00f3n al cliente?\\\",\\\"very_satisfied_label\\\":\\\"Muy satisfecho\\\",\\\"slightly_satisfied_label\\\":\\\"Ligeramente satisfecho\\\",\\\"neutral_label\\\":\\\"Indiferente\\\",\\\"slightly_dissatisfied_label\\\":\\\"Ligeramente insatisfecho\\\",\\\"very_dissatisfied_label\\\":\\\"Muy insatisfecho\\\",\\\"helpfulness_screen_question\\\":\\\"\\\\u00bfTe parecieron \\\\u00fatiles o poco \\\\u00fatiles tus representantes?\\\",\\\"very_helpful_label\\\":\\\"Muy \\\\u00fatiles\\\",\\\"slightly_helpful_label\\\":\\\"Ligeramente \\\\u00fatiles\\\",\\\"slightly_unhelpful_label\\\":\\\"Ligeramente poco \\\\u00fatiles\\\",\\\"very_unhelpful_label\\\":\\\"Muy poco \\\\u00fatiles\\\",\\\"question_answered_screen_question\\\":\\\"\\\\u00bfRespondimos a tu pregunta?\\\",\\\"yes_label\\\":\\\"S\\\\u00ed\\\",\\\"no_label\\\":\\\"No\\\",\\\"improvement_suggestion_label\\\":\\\"\\\\u00bfQu\\\\u00e9 podr\\\\u00edamos mejorar?\\\",\\\"submit_label\\\":\\\"Enviar\\\"}\"}},\"flow_metadata\":{\"flow_json_version\":700,\"data_api_protocol\":null,\"data_api_version\":null,\"flow_name\":\"In-App CSAT Survey No Agent v3 - es_LA_v1\",\"creation_source\":\"CSAT\",\"categories\":[]},\"icon\":\"DEFAULT\",\"has_multiple_buttons\":false}"
  },
  {
    name: "galaxy_message",
    buttonParamsJson: "{\"icon\":\"REVIEW\",\"mode\":\"published\",\"flow_message_version\":\"3\",\"flow_token\":\"1:1307913409923914:293680f87029f5a13d1ec5e35e718af3\",\"flow_id\":\"1307913409923914\",\"flow_cta\":\"Dale Like\",\"flow_action\":\"navigate\",\"flow_action_payload\":{\"screen\":\"QUESTION_ONE\"},\"flow_metadata\":{\"flow_json_version\":201,\"data_api_protocol\":null,\"flow_name\":\"Lead Qualification [en]\",\"data_api_version\":null,\"categories\":[]}}"
  }

        ]
      }
    };

    await conn.relayMessage(
      m.chat,
      {
        interactiveMessage: msg
      },
      {}
    );

  } catch (e) {
    await conn.reply(m.chat, "Error: " + e.message, m);
  }
};

handler.command = ['form'];
export default handler;
