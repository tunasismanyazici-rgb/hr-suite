export type LegalDocumentKey = "aydinlatma" | "acikRiza" | "adayHavuzu";

export interface LegalDocument {
  version: string;
  title: string;
  body: string;
}

// Bu metinlerden herhangi biri değiştiğinde ilgili belgenin `version`
// alanı artırılmalı (ör. "v1.0" -> "v1.1"). consents tablosu her onayı
// hangi sürüm için verildiğiyle birlikte sakladığından, version sabit
// kalırsa geçmiş onaylar hangi metne dayandığı belirsizleşir.
export const legalDocuments: Record<LegalDocumentKey, LegalDocument> = {
  aydinlatma: {
    version: "v1.0",
    title: "Aydınlatma Metni",
    body: "Bu bir yer tutucu aydınlatma metnidir. Nihai içerik hukuk ekibi tarafından sağlanacaktır.",
  },
  acikRiza: {
    version: "v1.0",
    title: "Açık Rıza Metni",
    body: "Bu bir yer tutucu açık rıza metnidir. Nihai içerik hukuk ekibi tarafından sağlanacaktır.",
  },
  adayHavuzu: {
    version: "v1.0",
    title: "Aday Havuzu Saklama Metni",
    body: "Bu bir yer tutucu aday havuzu saklama metnidir. Nihai içerik hukuk ekibi tarafından sağlanacaktır.",
  },
};
