import { useState } from "react";
import {
  X,
  Store,
  Truck,
  CreditCard,
  Banknote,
  QrCode,
  Check,
  Receipt,
  ArrowLeft,
  ShoppingBag,
} from "lucide-react";

export interface CheckoutProduct {
  id: string;
  title: string;
  price: number | string | null;
  image_url: string | null;
  checkout_url?: string | null;
}

type Step =
  | "mode"        // payer en caisse vs retrait/livraison
  | "fulfillment" // retrait ou livraison
  | "payment"     // paiement en ligne (QR Stripe) ou à la livraison
  | "qr"          // afficher QR code Stripe / produit
  | "success";    // commande confirmée

interface Props {
  product: CheckoutProduct;
  onClose: () => void;
}

const qrSrc = (data: string, size = 260) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(
    data,
  )}`;

const genOrderNumber = () =>
  "VDX-" +
  Math.random().toString(36).slice(2, 6).toUpperCase() +
  "-" +
  Date.now().toString().slice(-4);

export default function CheckoutFlow({ product, onClose }: Props) {
  const [step, setStep] = useState<Step>("mode");
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery" | null>(null);
  const [payment, setPayment] = useState<"counter" | "online" | "on_delivery" | null>(null);
  const [orderNumber] = useState(genOrderNumber());

  const productUrl =
    product.checkout_url ||
    `https://newai.sale/product/${product.id}`;

  const stripeQrUrl = productUrl; // lien checkout Shopify/Stripe encodé en QR

  const back = () => {
    if (step === "qr") setStep("payment");
    else if (step === "payment") setStep("fulfillment");
    else if (step === "fulfillment") setStep("mode");
    else if (step === "success") onClose();
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-black border border-cyan-500/30 shadow-[0_0_80px_rgba(34,211,238,0.25)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/20 bg-slate-950/60">
          <button
            onClick={back}
            className="p-2 rounded-lg text-cyan-200 hover:bg-cyan-500/10 transition"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <p className="text-[10px] tracking-[0.4em] text-cyan-300/80 font-mono">
            ◤ CAISSE VENDIX ◢
          </p>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 transition"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product summary */}
        {step !== "success" && (
          <div className="flex items-center gap-3 p-4 border-b border-cyan-500/10 bg-slate-900/40">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.title}
                className="w-14 h-14 rounded-xl object-cover border border-cyan-500/30"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-cyan-50 line-clamp-1">{product.title}</p>
              {product.price != null && (
                <p className="text-lg font-bold text-cyan-300">{product.price}€</p>
              )}
            </div>
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-cyan-300/80 hover:text-cyan-200 underline underline-offset-4"
            >
              voir
            </a>
          </div>
        )}

        {/* Body */}
        <div className="p-6">
          {step === "mode" && (
            <>
              <h3 className="text-lg font-bold text-white mb-1">
                Comment souhaitez-vous procéder ?
              </h3>
              <p className="text-sm text-slate-400 mb-5">
                Choisissez votre mode d'achat.
              </p>
              <div className="grid grid-cols-1 gap-3">
                <ChoiceCard
                  icon={<Banknote className="w-6 h-6" />}
                  title="Payer en caisse"
                  desc="Un vendeur finalise votre paiement à la caisse du showroom."
                  onClick={() => {
                    setPayment("counter");
                    setFulfillment("pickup");
                    setStep("success");
                  }}
                />
                <ChoiceCard
                  icon={<ShoppingBag className="w-6 h-6" />}
                  title="Retrait ou livraison"
                  desc="Réservez maintenant, choisissez le mode de réception."
                  onClick={() => setStep("fulfillment")}
                />
                <ChoiceCard
                  icon={<QrCode className="w-6 h-6" />}
                  title="Voir le produit (QR)"
                  desc="Scannez avec votre téléphone pour ouvrir la fiche produit."
                  onClick={() => {
                    setPayment(null);
                    setStep("qr");
                  }}
                />
              </div>
            </>
          )}

          {step === "fulfillment" && (
            <>
              <h3 className="text-lg font-bold text-white mb-1">
                Retrait ou livraison ?
              </h3>
              <p className="text-sm text-slate-400 mb-5">
                Comment souhaitez-vous recevoir votre produit ?
              </p>
              <div className="grid grid-cols-1 gap-3">
                <ChoiceCard
                  icon={<Store className="w-6 h-6" />}
                  title="Retrait en showroom"
                  desc="Prêt sous 24h, présentez votre numéro de commande."
                  onClick={() => {
                    setFulfillment("pickup");
                    setStep("payment");
                  }}
                />
                <ChoiceCard
                  icon={<Truck className="w-6 h-6" />}
                  title="Livraison à domicile"
                  desc="Livraison standard 3-5 jours ouvrés."
                  onClick={() => {
                    setFulfillment("delivery");
                    setStep("payment");
                  }}
                />
              </div>
            </>
          )}

          {step === "payment" && (
            <>
              <h3 className="text-lg font-bold text-white mb-1">
                Mode de paiement
              </h3>
              <p className="text-sm text-slate-400 mb-5">
                {fulfillment === "delivery"
                  ? "Payez en ligne maintenant ou à la livraison."
                  : "Payez en ligne maintenant ou en caisse lors du retrait."}
              </p>
              <div className="grid grid-cols-1 gap-3">
                <ChoiceCard
                  icon={<CreditCard className="w-6 h-6" />}
                  title="Payer en ligne (QR Stripe)"
                  desc="Scannez le QR code avec votre téléphone pour payer en sécurité."
                  onClick={() => {
                    setPayment("online");
                    setStep("qr");
                  }}
                />
                <ChoiceCard
                  icon={<Banknote className="w-6 h-6" />}
                  title={
                    fulfillment === "delivery"
                      ? "Payer à la livraison"
                      : "Payer en caisse"
                  }
                  desc={
                    fulfillment === "delivery"
                      ? "Réglez le livreur en espèces ou par carte."
                      : "Réglez en caisse lors du retrait du produit."
                  }
                  onClick={() => {
                    setPayment(
                      fulfillment === "delivery" ? "on_delivery" : "counter",
                    );
                    setStep("success");
                  }}
                />
              </div>
            </>
          )}

          {step === "qr" && (
            <div className="flex flex-col items-center text-center">
              <h3 className="text-lg font-bold text-white mb-1">
                {payment === "online"
                  ? "Scannez pour payer"
                  : "Scannez la fiche produit"}
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                {payment === "online"
                  ? "Ouvrez l'appareil photo et scannez ce QR code Stripe sécurisé."
                  : "Pointez l'appareil photo de votre téléphone vers ce QR code."}
              </p>
              <div className="p-4 bg-white rounded-2xl shadow-[0_0_50px_rgba(34,211,238,0.35)]">
                <img
                  src={qrSrc(stripeQrUrl, 260)}
                  alt="QR code"
                  width={260}
                  height={260}
                />
              </div>
              <p className="text-[11px] text-cyan-300/70 mt-3 break-all max-w-xs">
                {stripeQrUrl}
              </p>
              {payment === "online" && (
                <button
                  onClick={() => setStep("success")}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/30"
                >
                  J'ai payé · Confirmer
                </button>
              )}
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center text-center py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                <Check className="w-8 h-8 text-emerald-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">
                Commande confirmée 🎉
              </h3>
              <p className="text-sm text-slate-300 mb-5">
                Merci pour votre achat. Voici votre numéro de commande.
              </p>

              <div className="w-full rounded-2xl border border-cyan-500/30 bg-slate-900/60 p-4 mb-4">
                <p className="text-[10px] tracking-[0.3em] text-cyan-300/70 mb-1">
                  N° DE COMMANDE
                </p>
                <p className="text-2xl font-mono font-bold text-cyan-200">
                  {orderNumber}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {payment === "counter" && "À régler en caisse — présentez ce numéro."}
                  {payment === "on_delivery" && "À régler à la livraison."}
                  {payment === "online" && "Paiement reçu — préparation en cours."}
                  {payment === null && "Réservation enregistrée."}
                </p>
              </div>

              <div className="flex flex-col items-center">
                <p className="text-[10px] tracking-[0.3em] text-cyan-300/70 mb-2 flex items-center gap-2">
                  <Receipt className="w-3 h-3" /> TICKET DE CAISSE
                </p>
                <div className="p-3 bg-white rounded-xl">
                  <img
                    src={qrSrc(
                      `ORDER:${orderNumber}|PRODUCT:${product.id}|PRICE:${product.price}|PAY:${payment}|MODE:${fulfillment ?? "n/a"}`,
                      180,
                    )}
                    alt="QR ticket"
                    width={180}
                    height={180}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  Scannez ce code à l'accueil pour obtenir votre ticket imprimé.
                </p>
              </div>

              <button
                onClick={onClose}
                className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/30"
              >
                Terminer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-4 text-left p-4 rounded-2xl bg-slate-900/60 border border-cyan-500/20 hover:border-cyan-400/70 hover:bg-cyan-500/10 hover:shadow-[0_0_25px_rgba(34,211,238,0.25)] transition-all"
    >
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 shrink-0 group-hover:scale-105 transition">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-white font-semibold">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </button>
  );
}
