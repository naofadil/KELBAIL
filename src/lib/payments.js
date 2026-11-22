/**
 * Intégration des moyens de paiement « wallet » (Apple Pay / Google Pay) en
 * complément du Mobile Money (USSD), via les API web standards du navigateur.
 *
 * Asymétrie importante entre les deux, assumée et expliquée à l'utilisateur
 * dans l'interface plutôt que cachée :
 *
 * - Google Pay peut être démontré de bout en bout ici : on utilise la
 *   passerelle de test PUBLIQUE fournie par Google (`gateway: 'example'`,
 *   `environment: 'TEST'`), ce qui affiche la vraie feuille de paiement
 *   native Google Pay et renvoie un jeton de test — sans compte marchand réel.
 *
 * - Apple Pay ne peut PAS fonctionner, même en démonstration, sans serveur :
 *   dès `session.begin()`, Safari déclenche l'événement `validatemerchant`,
 *   qui exige un appel serveur signé avec le certificat marchand Apple pour
 *   valider la session directement auprès des serveurs d'Apple. Il n'existe
 *   aucun équivalent « mode test » côté client pour cette étape. On détecte
 *   donc la compatibilité de l'appareil, mais on explique la limite au lieu
 *   d'ouvrir une feuille de paiement qui échouerait silencieusement.
 *
 * Pour un vrai encaissement en production (Mobile Money inclus, d'ailleurs —
 * voir la note dans `ops.purchase` côté `api/client.js`), il faut un backend
 * relié à un prestataire de paiement opérant en Afrique de l'Ouest
 * (CinetPay, PayDunya, Kkiapay...), qui gère à la fois le Mobile Money par
 * callback serveur-à-serveur et, pour certains, Apple Pay / Google Pay via
 * l'acceptation carte.
 */

/** Google Pay s'appuie sur l'API Web Payments, assez largement supportée. */
export function supportsGooglePay() {
  return typeof window !== 'undefined' && 'PaymentRequest' in window
}

/** Apple Pay exige Safari + un appareil/compte compatible. */
export function supportsApplePay() {
  try {
    return typeof window !== 'undefined' && 'ApplePaySession' in window
      && window.ApplePaySession.canMakePayments()
  } catch { return false }
}

/**
 * Ouvre la feuille Google Pay native. Résout avec un jeton (de test) si
 * l'utilisateur confirme, ou lève une erreur (annulation / indisponible).
 * Le montant est en F CFA (XOF), sans décimales.
 */
export async function payWithGooglePay({ amount, label }) {
  if (!supportsGooglePay()) throw new Error('Google Pay non disponible sur cet appareil')

  const methodData = [{
    supportedMethods: 'https://pay.google.com/gp/pay',
    data: {
      environment: 'TEST',
      apiVersion: 2,
      apiVersionMinor: 0,
      merchantInfo: { merchantName: 'Kel Bail (démo)' },
      allowedPaymentMethods: [{
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: ['VISA', 'MASTERCARD'],
        },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: { gateway: 'example', gatewayMerchantId: 'exampleGatewayMerchantId' },
        },
      }],
    },
  }]
  const details = {
    total: {
      label: label || 'Billet Kel Bail',
      amount: { currency: 'XOF', value: String(Math.max(1, Math.round(amount))) },
    },
  }

  const request = new PaymentRequest(methodData, details)
  const canPay = await request.canMakePayment().catch(() => null)
  if (canPay === false) throw new Error('Aucune carte test disponible pour Google Pay sur cet appareil')

  const response = await request.show()
  await response.complete('success')
  return { token: response.details, methodName: response.methodName }
}
