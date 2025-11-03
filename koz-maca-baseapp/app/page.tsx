"use client";

import {
  CSSProperties,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { Wallet } from "@coinbase/onchainkit/wallet";
import styles from "./page.module.css";

type Suit = "S" | "H" | "D" | "C";
type Rank =
  | "A"
  | "K"
  | "Q"
  | "J"
  | "10"
  | "9"
  | "8"
  | "7"
  | "6"
  | "5"
  | "4"
  | "3"
  | "2";

type Card = {
  suit: Suit;
  rank: Rank;
};

type RoundResult = {
  actual: number;
  bid: number;
  success: boolean;
  difference: number;
};

const SUIT_LABELS: Record<Suit, string> = {
  S: "Maça",
  H: "Kupa",
  D: "Karo",
  C: "Sinek",
};

const SUIT_SYMBOLS: Record<Suit, string> = {
  S: "\u2660",
  H: "\u2665",
  D: "\u2666",
  C: "\u2663",
};

const SUIT_COLORS: Record<Suit, string> = {
  S: "#111827",
  H: "#b91c1c",
  D: "#b91c1c",
  C: "#111827",
};

const BID_OPTIONS = Array.from({ length: 13 }, (_, index) => index + 1);

const RANK_ORDER: Rank[] = [
  "A",
  "K",
  "Q",
  "J",
  "10",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
];

const SUIT_ORDER: Suit[] = ["S", "H", "C", "D"];

const createDeck = (): Card[] => {
  const suits: Suit[] = ["S", "H", "D", "C"];
  const ranks: Rank[] = [
    "A",
    "K",
    "Q",
    "J",
    "10",
    "9",
    "8",
    "7",
    "6",
    "5",
    "4",
    "3",
    "2",
  ];

  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }

  return deck;
};

const shuffle = (deck: Card[], rng: () => number): Card[] => {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const sortHand = (hand: Card[]): Card[] => {
  return [...hand].sort((a, b) => {
    const suitDiff = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
    if (suitDiff !== 0) {
      return suitDiff;
    }
    return RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
  });
};

const dealHand = (rng: () => number = Math.random): Card[] => {
  const deck = shuffle(createDeck(), rng);
  return sortHand(deck.slice(0, 13));
};

const seedFromId = (id: string): number => {
  let seed = 0;
  for (let i = 0; i < id.length; i += 1) {
    seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  }
  return seed || 1;
};

const createSeededRandom = (seedValue: number): (() => number) => {
  let seed = seedValue % 2147483647;
  if (seed <= 0) {
    seed += 2147483646;
  }
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
};

type CardGraphicProps = {
  card: Card;
};

const CardGraphic = ({ card }: CardGraphicProps) => {
  const symbol = SUIT_SYMBOLS[card.suit];
  const color = SUIT_COLORS[card.suit];
  const rankText = card.rank;

  return (
    <svg
      className={styles.cardFace}
      viewBox="0 0 200 280"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`shade-${card.suit}`} x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      <rect
        x="8"
        y="8"
        width="184"
        height="264"
        rx="20"
        fill={`url(#shade-${card.suit})`}
        stroke="#1f2937"
        strokeWidth="6"
      />
      <text
        x="26"
        y="56"
        fontSize={rankText === "10" ? 44 : 48}
        fontFamily="Georgia, 'Times New Roman', serif"
        fill={color}
        fontWeight="700"
      >
        {rankText}
      </text>
      <text
        x="174"
        y="228"
        fontSize={rankText === "10" ? 44 : 48}
        fontFamily="Georgia, 'Times New Roman', serif"
        fill={color}
        fontWeight="700"
        transform="rotate(180 174 228)"
      >
        {rankText}
      </text>
      <g fill={color}>
        <text
          x="36"
          y="102"
          fontSize="48"
          fontFamily="'Noto Sans Symbols', 'Segoe UI Symbol', serif"
        >
          {symbol}
        </text>
        <text
          x="164"
          y="178"
          fontSize="48"
          fontFamily="'Noto Sans Symbols', 'Segoe UI Symbol', serif"
          transform="rotate(180 164 178)"
        >
          {symbol}
        </text>
      </g>
      <text
        x="100"
        y="148"
        textAnchor="middle"
        fontSize="102"
        fontFamily="'Noto Sans Symbols', 'Segoe UI Symbol', serif"
        fill={color}
      >
        {symbol}
      </text>
    </svg>
  );
};

const calculateTricks = (hand: Card[]): number => {
  const rankScores: Record<Rank, number> = {
    A: 1.4,
    K: 1.2,
    Q: 0.9,
    J: 0.7,
    "10": 0.6,
    "9": 0.4,
    "8": 0.3,
    "7": 0.2,
    "6": 0.2,
    "5": 0.1,
    "4": 0.1,
    "3": 0.1,
    "2": 0.1,
  };

  const totalScore = hand.reduce((score, card) => {
    const base = rankScores[card.rank] ?? 0.1;
    const trumpBonus = card.suit === "S" ? 0.6 : 0;
    const faceBonus =
      card.suit === "S" && (card.rank === "A" || card.rank === "K") ? 0.5 : 0;
    return score + base + trumpBonus + faceBonus;
  }, 0);

  const estimatedTricks = Math.round(totalScore / 2);
  return Math.min(13, Math.max(0, estimatedTricks));
};

export default function Home() {
  const stableId = useId();
  const bidLabelId = `${stableId}-bid-label`;
  const initialHand = useMemo(() => {
    const seededRandom = createSeededRandom(seedFromId(stableId));
    return dealHand(seededRandom);
  }, [stableId]);

  const cardGridRef = useRef<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(360);

  useEffect(() => {
    const element = cardGridRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const initialRect = element.getBoundingClientRect();
    if (initialRect.width) {
      const measured = Math.round(initialRect.width);
      setGridWidth((prev) => (prev !== measured ? measured : prev));
    }

    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (!entry) {
        return;
      }
      const nextWidth = Math.round(entry.contentRect.width);
      setGridWidth((prev) => (prev !== nextWidth ? nextWidth : prev));
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const [hand, setHand] = useState<Card[]>(initialHand);
  const [bid, setBid] = useState<number>(5);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);

  const layout = useMemo(() => {
    const topRowCount = Math.min(6, hand.length);
    const bottomRowCount = Math.max(hand.length - topRowCount, 0);
    const compact = gridWidth < 340;

    const baseRotationSpread = compact ? 40 : 50;
    const topRotationSpread = baseRotationSpread;
    const bottomRotationSpread = baseRotationSpread;

    const topCardWidth = Math.min(88, Math.max(60, gridWidth / (compact ? 4.9 : 4.4)));
    const bottomCardWidth = topCardWidth;

    const cardHeight = topCardWidth * (7 / 5);

    const baseRadius = gridWidth * (compact ? 0.42 : 0.48);
    const topRadius = baseRadius;
    const bottomRadius = baseRadius;

    const topOffset = cardHeight * 0.1;
    const bottomOffset = topOffset + cardHeight * 0.5;

    const createRowStyles = (
      count: number,
      rotationSpread: number,
      radius: number,
      translateY: number,
      baseZIndex: number,
      cardWidth: number
    ) => {
      if (count <= 0) {
        return [];
      }

      const rotationStep = count > 1 ? rotationSpread / (count - 1) : 0;

      return Array.from({ length: count }).map((_, index) => {
        const rotation = -rotationSpread / 2 + rotationStep * index;
        const radians = (rotation * Math.PI) / 180;
        const translateX = radius * Math.sin(radians);
        const translateYCalculated = radius * (1 - Math.cos(radians)) + translateY;

        return {
          left: `calc(50% + ${translateX}px)`,
          transform: `translate(-50%, ${translateYCalculated}px) rotate(${rotation}deg)`,
          zIndex: baseZIndex + index,
          width: `${cardWidth}px`,
        } as CSSProperties;
      });
    };

    const topRowStyles = createRowStyles(
      topRowCount,
      topRotationSpread,
      topRadius,
      topOffset,
      150,
      topCardWidth
    );

    const bottomRowStyles = createRowStyles(
      bottomRowCount,
      bottomRotationSpread,
      bottomRadius,
      bottomOffset,
      300,
      bottomCardWidth
    );

    const estimatedHeight =
      bottomRowCount > 0
        ? bottomOffset + cardHeight * 1.25
        : cardHeight * 1.6;

    const safeHeight = Math.max(estimatedHeight, cardHeight * 1.65);

    return {
      cardStyles: [...topRowStyles, ...bottomRowStyles],
      gridHeight: safeHeight,
    };
  }, [gridWidth, hand]);

  const cardStyles = layout.cardStyles;
  const cardGridHeight = layout.gridHeight;

  const handlePlayRound = () => {
    const actual = calculateTricks(hand);
    const difference = actual - bid;
    const success = difference >= 0 && difference <= 2;
    setRoundResult({
      actual,
      bid,
      difference,
      success,
    });
  };

  const handleNewHand = () => {
    setHand(dealHand());
    setRoundResult(null);
    setBid(5);
  };

  const readyCalledRef = useRef(false);

  useEffect(() => {
    if (readyCalledRef.current) {
      return;
    }

    let cancelled = false;

    const signalReady = async () => {
      if (typeof window === "undefined") {
        return;
      }

      if (!sdk?.actions?.ready) {
        return;
      }

      try {
        await sdk.actions.ready();
        if (!cancelled) {
          readyCalledRef.current = true;
        }
      } catch (error) {
        console.warn("[miniapp] sdk.ready() failed", error);
      }
    };

    signalReady();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.headerWrapper}>
        <div className={styles.walletHidden}>
          <Wallet />
        </div>
      </header>

      <main className={styles.gameArea}>
        <section className={styles.intro}>
          <h1>Koz Maça Batak</h1>
          <p>
            Kartların dağıtıldı, eline bak ve kaç el alabileceğini tahmin et.
            Tahminin tutmazsa batarsın!
          </p>
        </section>

        <section className={styles.handSection}>
          <div className={styles.sectionHeader}>
            <button className={styles.secondaryButton} onClick={handleNewHand}>
              Yeniden Dağıt
            </button>
          </div>
          <div
            ref={cardGridRef}
            className={styles.cardGrid}
            style={{ height: `${cardGridHeight}px` }}
          >
            {hand.map((card, index) => (
              <div
                key={`${card.suit}-${card.rank}-${index}`}
                className={`${styles.card} ${styles[`suit${card.suit}`]}`}
                style={cardStyles[index] ?? undefined}
                aria-label={`${SUIT_LABELS[card.suit]} ${card.rank}`}
              >
                <CardGraphic card={card} />
                <span className={styles.srOnly}>
                  {card.rank} {SUIT_LABELS[card.suit]}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.controls}>
          <div className={styles.controlRow}>
            <p id={bidLabelId} className={styles.label}>
              Kaç el alabileceğini seç
            </p>
            <div
              className={styles.bidOptions}
              role="radiogroup"
              aria-labelledby={bidLabelId}
            >
              {BID_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={bid === option}
                  tabIndex={bid === option ? 0 : -1}
                  onClick={() => setBid(option)}
                  className={`${styles.bidOption} ${
                    bid === option ? styles.bidOptionActive : ""
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <button className={styles.primaryButton} onClick={handlePlayRound}>
            Eli Oyna
          </button>
        </section>

        {roundResult && (
          <div className={styles.modalOverlay} role="presentation">
            <section
              className={`${styles.modalContent} ${
                roundResult.success ? styles.success : styles.fail
              }`}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${stableId}-result-title`}
            >
              <div
                className={`${styles.modalIcon} ${
                  roundResult.success ? styles.iconSuccess : styles.iconFail
                }`}
                aria-hidden="true"
              >
                {roundResult.success ? (
                  <svg viewBox="0 0 64 64" className={styles.iconSvg}>
                    <defs>
                      <linearGradient id="successGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                    <circle cx="32" cy="32" r="30" fill="url(#successGradient)" />
                    <path
                      d="M22 32.5l7.2 7.3L42 26"
                      stroke="#0f172a"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 64 64" className={styles.iconSvg}>
                    <defs>
                      <linearGradient id="failGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                    <circle cx="32" cy="32" r="30" fill="url(#failGradient)" />
                    <path
                      d="M24 24l16 16M40 24L24 40"
                      stroke="#0f172a"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>
              <h3 id={`${stableId}-result-title`}>Sonuç</h3>
              <p>
                Tahminin {roundResult.bid} eldi, {roundResult.actual} el aldın.
              </p>
              <p>
                {roundResult.success
                  ? "Tahminin tuttu, bu eli kurtardın!"
                  : roundResult.difference < 0
                  ? "Tahmininin altında kaldın, maalesef battın."
                  : "Tahmininden 3 ya da daha fazla aldın, maalesef battın."}
              </p>
              <button
                className={styles.modalButton}
                onClick={handleNewHand}
                autoFocus
              >
                Yeni El Dağıt
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
