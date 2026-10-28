// ilustrasi benda "setara dengan" (dari desain canvas spot.), satu per id di lib/setara.ts
import { Children, isValidElement } from "react";
import type { Item } from "@/lib/setara";

const LABEL: Record<Item["id"], string> = {
  durian: "durian",
  kucing: "kucing oranye",
  galon: "galon air",
  beras: "karung beras 25 kg",
  kulkas: "kulkas 2 pintu",
  komodo: "komodo",
  orangutan: "orangutan",
  motor: "motor matic",
  piano: "piano",
  sapi: "sapi bali",
  badak: "badak sumatera",
  mobil: "mobil",
  gajah: "gajah sumatera",
  paus: "paus biru",
};

// kulit durian: 40 titik bergantian jauh/dekat dari pusat
const DURIAN_SPIKES = Array.from({ length: 40 }, (_, i) => {
  const a = (i / 40) * Math.PI * 2;
  const k = i % 2 === 0 ? 1.12 : 0.98;
  return `${(120 + Math.cos(a) * 44 * k).toFixed(1)},${(74 + Math.sin(a) * 40 * k).toFixed(1)}`;
}).join(" ");

const ART: Record<Item["id"], React.ReactNode> = {
  mobil: (
    <>
      <ellipse cx="122" cy="117" rx="100" ry="6" fill="#000" opacity="0.3" />
      <path d="M22 92 C20 80 26 72 40 70 L74 66 L98 44 C103 39 109 37 116 37 L162 37 C170 37 176 40 181 46 L202 68 C214 70 222 77 222 88 L222 94 C222 98 219 100 215 100 L28 100 C24 100 22 98 22 94 Z" fill="#FF6B35" />
      <path d="M22 88 L222 88 L222 94 C222 98 219 100 215 100 L28 100 C24 100 22 98 22 94 Z" fill="#D9531F" />
      <path d="M82 66 L102 47 C105 44 109 42 114 42 L138 42 L138 66 Z" fill="#2A2A28" />
      <path d="M144 42 L160 42 C166 42 171 44 175 49 L192 66 L144 66 Z" fill="#2A2A28" />
      <path d="M106 46 L120 46 L100 63 L90 63 Z" fill="#5A5A55" opacity="0.8" />
      <path d="M150 46 L156 46 L148 63 L144 63 Z" fill="#5A5A55" opacity="0.6" />
      <path d="M140 68 L140 94 M84 68 L84 94" stroke="#B8461A" strokeWidth="1.5" />
      <rect x="150" y="74" width="12" height="3" rx="1.5" fill="#8F3410" />
      <rect x="104" y="74" width="12" height="3" rx="1.5" fill="#8F3410" />
      <path d="M208 74 L220 77 L220 83 L206 81 Z" fill="#FFE2D3" />
      <rect x="22" y="74" width="8" height="9" rx="2" fill="#7A1E0A" />
      <path d="M40 70 Q60 60 82 66" stroke="#FF8A5C" strokeWidth="2" fill="none" opacity="0.7" />
      <circle cx="64" cy="100" r="17" fill="#121212" stroke="#3A3A37" /><circle cx="64" cy="100" r="9.5" fill="#C9C7C0" /><circle cx="64" cy="100" r="3.5" fill="#3A3A37" />
      <circle cx="182" cy="100" r="17" fill="#121212" stroke="#3A3A37" /><circle cx="182" cy="100" r="9.5" fill="#C9C7C0" /><circle cx="182" cy="100" r="3.5" fill="#3A3A37" />
    </>
  ),
  gajah: (
    <>
      <ellipse cx="124" cy="118" rx="92" ry="6" fill="#000" opacity="0.3" />
      <path d="M192 62 C200 70 203 82 200 94" stroke="#6F6B64" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M72 60 C72 38 94 24 124 24 C160 24 186 38 192 62 C196 78 192 92 186 100 L186 114 L170 114 L168 100 L152 102 L150 114 L134 114 L132 100 C120 100 110 98 102 94 L100 114 L84 114 L82 92 C76 86 72 74 72 60 Z" fill="#8E8A82" />
      <path d="M150 102 L150 114 L134 114 L132 100 Z M100 94 L100 114 L84 114 L82 92 Z" fill="#7A766F" />
      <path d="M100 40 C120 30 160 30 182 46" stroke="#A9A59C" strokeWidth="3" fill="none" opacity="0.6" />
      <path d="M44 52 C44 34 58 22 76 22 C92 22 104 32 104 50 C104 64 96 74 86 78 C80 88 76 98 78 108 C79 113 75 115 72 112 C64 104 62 94 64 82 C52 78 44 68 44 52 Z" fill="#9A968E" />
      <path d="M78 30 C96 24 114 34 114 54 C114 72 100 82 88 80 C80 78 76 70 76 58 Z" fill="#7A766F" />
      <path d="M84 40 C96 38 106 46 106 56" stroke="#8E8A82" strokeWidth="2" fill="none" />
      <circle cx="60" cy="46" r="2.6" fill="#121212" />
      <path d="M66 78 C60 84 53 84 48 81" stroke="#F2F0EB" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M66 92 q4 2 8 0 M66 99 q4 2 8 0 M68 106 q3 2 6 0" stroke="#6F6B64" strokeWidth="1.5" fill="none" />
      <path d="M86 112 h3 M92 112 h3 M172 112 h3 M178 112 h3" stroke="#D6D2C8" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  motor: (
    <>
      <ellipse cx="128" cy="118" rx="92" ry="6" fill="#000" opacity="0.3" />
      <path d="M40 86 C40 70 54 62 72 62 L124 62 C132 62 136 66 138 72 L144 92 L48 98 C43 96 40 92 40 86 Z" fill="#F2F0EB" />
      <path d="M44 92 L144 88 L144 92 L48 98 C46 97 45 95 44 92 Z" fill="#C9C7C0" />
      <path d="M48 80 L136 74" stroke="#FF6B35" strokeWidth="4" strokeLinecap="round" />
      <path d="M58 60 C58 53 64 49 72 49 L118 49 C126 49 131 53 131 60 L131 63 L58 63 Z" fill="#2A2A28" />
      <path d="M66 53 L120 53" stroke="#4A4A46" strokeWidth="2" strokeLinecap="round" />
      <path d="M120 92 L166 92 L168 99 L118 101 Z" fill="#3A3A37" />
      <path d="M158 98 L170 46 C172 40 178 37 184 40 L190 44 L176 99 Z" fill="#FF6B35" />
      <path d="M172 50 L182 46 L176 90 L168 92 Z" fill="#D9531F" opacity="0.6" />
      <path d="M166 34 L200 30" stroke="#5A5A55" strokeWidth="5" strokeLinecap="round" />
      <path d="M178 40 L183 31" stroke="#5A5A55" strokeWidth="5" />
      <ellipse cx="193" cy="49" rx="6" ry="4.5" fill="#FFE2D3" />
      <path d="M172 94 C176 85 198 85 203 94" stroke="#FF6B35" strokeWidth="6" fill="none" strokeLinecap="round" />
      <rect x="37" y="76" width="6" height="9" rx="2" fill="#C0392B" />
      <circle cx="70" cy="103" r="15" fill="#121212" stroke="#3A3A37" /><circle cx="70" cy="103" r="7" fill="#9C9A93" />
      <circle cx="188" cy="103" r="15" fill="#121212" stroke="#3A3A37" /><circle cx="188" cy="103" r="7" fill="#9C9A93" />
    </>
  ),
  kucing: (
    <>
      <ellipse cx="124" cy="120" rx="58" ry="5" fill="#000" opacity="0.3" />
      <path d="M150 114 C182 114 194 96 188 80 C186 73 179 73 179 80 C183 93 172 103 150 103 Z" fill="#D9703D" />
      <path d="M90 116 C84 96 88 72 104 62 L138 62 C154 72 158 96 152 116 Z" fill="#E8834F" />
      <path d="M108 66 C114 80 128 80 134 66 C136 84 130 104 121 115 C112 104 106 84 108 66 Z" fill="#F2F0EB" />
      <path d="M92 84 L102 86 M90 96 L101 97 M150 84 L140 86 M152 96 L141 97" stroke="#C2612F" strokeWidth="3" strokeLinecap="round" />
      <path d="M98 34 L100 9 L117 24 Z M144 34 L142 9 L125 24 Z" fill="#E8834F" />
      <path d="M102 30 L103 16 L112 25 Z M140 30 L139 16 L130 25 Z" fill="#F5B79A" />
      <path d="M94 46 C94 30 106 21 121 21 C136 21 148 30 148 46 C148 61 136 71 121 71 C106 71 94 61 94 46 Z" fill="#E8834F" />
      <path d="M114 23 L116 33 M121 21 L121 32 M128 23 L126 33" stroke="#C2612F" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="121" cy="57" rx="12" ry="8" fill="#F2F0EB" />
      <ellipse cx="110" cy="45" rx="4" ry="5.5" fill="#2A2A28" /><ellipse cx="132" cy="45" rx="4" ry="5.5" fill="#2A2A28" />
      <circle cx="111.2" cy="43" r="1.4" fill="#F2F0EB" /><circle cx="133.2" cy="43" r="1.4" fill="#F2F0EB" />
      <path d="M118 52 L124 52 L121 55.5 Z" fill="#C2612F" />
      <path d="M108 57 L90 54 M108 60 L90 62 M134 57 L152 54 M134 60 L152 62" stroke="#F2F0EB" strokeWidth="1" opacity="0.8" />
      <ellipse cx="111" cy="115" rx="8" ry="4" fill="#F2F0EB" /><ellipse cx="131" cy="115" rx="8" ry="4" fill="#F2F0EB" />
    </>
  ),
  galon: (
    <>
      <ellipse cx="120" cy="121" rx="46" ry="5" fill="#000" opacity="0.3" />
      <path d="M84 40 C84 32 92 28 100 28 L140 28 C148 28 156 32 156 40 L156 108 C156 114 150 118 144 118 L96 118 C90 118 84 114 84 108 Z" fill="#CFE2EE" />
      <path d="M84 50 L156 50 L156 108 C156 114 150 118 144 118 L96 118 C90 118 84 114 84 108 Z" fill="#9CC3DD" />
      <path d="M84 50 C100 46 140 54 156 50" stroke="#CFE2EE" strokeWidth="2" fill="none" />
      <path d="M84 72 L156 72 M84 94 L156 94" stroke="#7EADCD" strokeWidth="3" />
      <path d="M104 28 L104 18 L136 18 L136 28 Z" fill="#CFE2EE" />
      <rect x="100" y="7" width="40" height="13" rx="3" fill="#FF6B35" />
      <rect x="100" y="16" width="40" height="3" fill="#D9531F" />
      <path d="M93 42 L93 106" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
      <path d="M146 60 L146 100" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
      <rect x="108" y="78" width="26" height="11" rx="2" fill="#F2F0EB" opacity="0.9" />
      <rect x="112" y="82" width="18" height="3" rx="1.5" fill="#FF6B35" />
    </>
  ),
  durian: (
    <>
      <ellipse cx="120" cy="120" rx="50" ry="5" fill="#000" opacity="0.3" />
      <polygon points={DURIAN_SPIKES} fill="#7C8A2E" />
      <ellipse cx="120" cy="74" rx="44" ry="40" fill="#8E9C38" />
      <path d="M86 92 C96 108 140 110 156 94 C150 112 96 116 86 92 Z" fill="#6F7C28" />
      <path d="M96 56 l4 -6 l4 6 M112 48 l4 -6 l4 6 M128 50 l4 -6 l4 6 M142 60 l4 -6 l4 6 M92 74 l4 -6 l4 6 M108 68 l4 -6 l4 6 M124 70 l4 -6 l4 6 M140 78 l4 -6 l4 6 M100 90 l4 -6 l4 6 M118 88 l4 -6 l4 6 M134 94 l4 -6 l4 6" stroke="#5E6A20" strokeWidth="2" fill="none" strokeLinejoin="round" />
      <path d="M98 50 C104 42 114 38 122 38" stroke="#B5C25A" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M120 34 C118 24 122 16 128 12" stroke="#6B4A2A" strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  ),
  beras: (
    <>
      <ellipse cx="120" cy="121" rx="48" ry="5" fill="#000" opacity="0.3" />
      <path d="M82 118 C76 100 76 62 86 44 L154 44 C164 62 164 100 158 118 Z" fill="#EDE6D6" />
      <path d="M86 44 C92 36 100 30 108 28 L132 28 C140 30 148 36 154 44 Z" fill="#E2D9C4" />
      <path d="M104 27 L95 13 L111 22 Z M136 27 L145 13 L129 22 Z" fill="#E2D9C4" />
      <rect x="104" y="23" width="32" height="7" rx="3" fill="#C9A86A" />
      <path d="M90 50 C96 70 94 100 90 116 M150 50 C144 70 146 100 150 116" stroke="#D6CCB6" strokeWidth="2" fill="none" />
      <rect x="92" y="64" width="56" height="34" rx="4" fill="#FF6B35" />
      <text x="120" y="80" textAnchor="middle" fontFamily="Geist, sans-serif" fontSize="11" fontWeight="800" fill="#121212">BERAS</text>
      <text x="120" y="92" textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="9" fill="#121212">25 kg</text>
      <path d="M84 60 C86 80 84 100 86 112" stroke="#FFFFFF" strokeWidth="3" fill="none" opacity="0.5" strokeLinecap="round" />
    </>
  ),
  kulkas: (
    <>
      <ellipse cx="124" cy="122" rx="48" ry="4" fill="#000" opacity="0.3" />
      <path d="M150 10 L164 16 L164 120 L150 118 Z" fill="#A9ADB4" />
      <rect x="86" y="10" width="64" height="108" rx="4" fill="#D9DCE1" />
      <path d="M86 46 L150 46" stroke="#B5B9C0" strokeWidth="2" />
      <rect x="140" y="20" width="4" height="18" rx="2" fill="#6F737A" />
      <rect x="140" y="54" width="4" height="30" rx="2" fill="#6F737A" />
      <rect x="92" y="14" width="6" height="98" rx="3" fill="#FFFFFF" opacity="0.4" />
      <circle cx="118" cy="106" r="2.5" fill="#FF6B35" />
      <rect x="90" y="118" width="8" height="4" fill="#3A3A37" /><rect x="138" y="118" width="8" height="4" fill="#3A3A37" />
    </>
  ),
  komodo: (
    <>
      <ellipse cx="124" cy="116" rx="104" ry="5" fill="#000" opacity="0.3" />
      <path d="M12 98 C34 94 58 88 82 84 L84 95 C60 99 36 101 12 99 Z" fill="#5E5D45" />
      <path d="M110 92 L102 104 L94 106" stroke="#4E4D3A" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M172 92 L182 104 L188 104" stroke="#4E4D3A" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M78 82 C88 70 110 66 140 68 C160 70 172 74 182 78 L184 92 C170 96 150 98 128 98 C108 98 92 96 80 94 Z" fill="#6E6C52" />
      <path d="M100 76 C120 72 150 72 172 79" stroke="#8A8866" strokeWidth="2.5" fill="none" opacity="0.8" />
      <path d="M96 86 l3 2 M110 88 l3 2 M124 89 l3 2 M138 89 l3 2 M152 88 l3 2" stroke="#5E5D45" strokeWidth="1.5" />
      <path d="M176 76 C188 70 206 70 218 76 C224 80 224 86 218 88 L184 92 Z" fill="#767458" />
      <path d="M188 86 L218 86" stroke="#4E4D3A" strokeWidth="1.5" />
      <circle cx="199" cy="77" r="2" fill="#121212" />
      <path d="M222 84 L232 82 L237 79 M232 82 L237 85" stroke="#E2553A" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M100 94 L92 108 L84 110" stroke="#5E5D45" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M162 94 L170 108 L178 110" stroke="#5E5D45" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  orangutan: (
    <>
      <ellipse cx="120" cy="121" rx="64" ry="5" fill="#000" opacity="0.3" />
      <path d="M96 56 C76 66 70 92 72 114" stroke="#A44A22" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M144 56 C164 66 170 92 168 114" stroke="#A44A22" strokeWidth="14" fill="none" strokeLinecap="round" />
      <ellipse cx="72" cy="116" rx="9" ry="5" fill="#5A3524" /><ellipse cx="168" cy="116" rx="9" ry="5" fill="#5A3524" />
      <path d="M92 60 C86 80 88 104 98 116 L142 116 C152 104 154 80 148 60 C140 50 100 50 92 60 Z" fill="#B5532A" />
      <ellipse cx="120" cy="90" rx="16" ry="20" fill="#C96B3E" />
      <path d="M92 70 l-6 6 M94 84 l-6 6 M146 70 l6 6 M146 84 l6 6 M100 104 l-4 6 M140 104 l4 6" stroke="#8F3E1C" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="106" cy="117" rx="10" ry="4" fill="#5A3524" /><ellipse cx="134" cy="117" rx="10" ry="4" fill="#5A3524" />
      <ellipse cx="120" cy="20" rx="14" ry="8" fill="#B5532A" />
      <ellipse cx="120" cy="38" rx="30" ry="21" fill="#7A4A30" />
      <ellipse cx="120" cy="40" rx="18" ry="17" fill="#5A3524" />
      <circle cx="113" cy="35" r="2.2" fill="#121212" /><circle cx="127" cy="35" r="2.2" fill="#121212" />
      <ellipse cx="120" cy="48" rx="10" ry="6" fill="#6E4430" />
      <path d="M117 46 h1 M122 46 h1" stroke="#2A1A12" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  piano: (
    <>
      <ellipse cx="120" cy="122" rx="72" ry="4" fill="#000" opacity="0.3" />
      <rect x="60" y="16" width="120" height="90" rx="4" fill="#1E1A18" stroke="#3A3330" strokeWidth="1" />
      <rect x="56" y="11" width="128" height="9" rx="3" fill="#2E2724" />
      <rect x="66" y="22" width="108" height="3" rx="1.5" fill="#FFFFFF" opacity="0.15" />
      <rect x="100" y="30" width="40" height="26" rx="2" fill="#F2F0EB" />
      <path d="M106 38 h28 M106 44 h28 M106 50 h20" stroke="#9C9A93" strokeWidth="1.5" />
      <path d="M106 34 h14" stroke="#FF6B35" strokeWidth="2" />
      <rect x="56" y="66" width="128" height="16" fill="#2E2724" />
      <rect x="62" y="68" width="116" height="10" fill="#F2F0EB" />
      <path d="M68 68 v6 M74 68 v6 M86 68 v6 M92 68 v6 M98 68 v6 M110 68 v6 M116 68 v6 M128 68 v6 M134 68 v6 M140 68 v6 M152 68 v6 M158 68 v6 M170 68 v6" stroke="#121212" strokeWidth="3" />
      <rect x="111" y="98" width="4" height="5" fill="#C9A86A" /><rect x="118" y="98" width="4" height="5" fill="#C9A86A" /><rect x="125" y="98" width="4" height="5" fill="#C9A86A" />
      <rect x="60" y="106" width="10" height="14" fill="#1E1A18" /><rect x="170" y="106" width="10" height="14" fill="#1E1A18" />
    </>
  ),
  sapi: (
    <>
      <ellipse cx="124" cy="118" rx="94" ry="5" fill="#000" opacity="0.3" />
      <path d="M196 60 C204 70 204 86 202 98" stroke="#8F4A22" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="202" cy="100" rx="3" ry="5" fill="#2A2A28" />
      <path d="M66 60 C70 46 90 40 120 40 L170 40 C186 40 196 50 196 64 C196 80 190 90 182 94 L182 114 L170 114 L168 96 L150 98 L148 114 L136 114 L134 98 L104 98 L102 114 L90 114 L88 96 C78 92 68 80 66 60 Z" fill="#B8642E" />
      <path d="M176 44 C190 48 196 58 196 68 C196 80 192 88 186 92 C180 82 176 66 176 44 Z" fill="#F2F0EB" />
      <path d="M80 46 C86 36 98 36 104 42 Z" fill="#A9572A" />
      <path d="M100 52 C120 46 150 46 170 50" stroke="#CF7A42" strokeWidth="3" fill="none" opacity="0.6" />
      <rect x="90" y="102" width="12" height="10" fill="#F2F0EB" /><rect x="136" y="102" width="12" height="10" fill="#F2F0EB" /><rect x="170" y="102" width="12" height="10" fill="#F2F0EB" />
      <rect x="90" y="112" width="12" height="3" fill="#2A2A28" /><rect x="136" y="112" width="12" height="3" fill="#2A2A28" /><rect x="170" y="112" width="12" height="3" fill="#2A2A28" />
      <path d="M70 52 C60 50 48 52 42 60 L36 76 C34 82 38 86 44 86 L58 84 C64 76 68 66 70 58 Z" fill="#A9572A" />
      <ellipse cx="42" cy="81" rx="8" ry="6" fill="#2A2A28" />
      <path d="M54 54 C50 44 54 38 60 36 M62 52 C62 44 66 40 72 40" stroke="#E8E1D0" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="68" cy="58" rx="7" ry="3.5" fill="#8F4A22" />
      <circle cx="52" cy="64" r="2" fill="#121212" />
    </>
  ),
  badak: (
    <>
      <ellipse cx="124" cy="118" rx="96" ry="5" fill="#000" opacity="0.3" />
      <path d="M194 66 C200 74 200 84 198 92" stroke="#6A5849" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M70 62 C72 44 96 34 128 34 C162 34 190 44 194 66 C196 82 190 94 182 98 L182 114 L166 114 L164 100 L148 102 L146 114 L130 114 L128 100 C116 100 104 98 96 96 L94 114 L78 114 L76 94 C72 86 70 76 70 62 Z" fill="#7E6A5A" />
      <path d="M102 40 C96 60 98 80 104 96 M168 40 C174 60 172 80 166 98" stroke="#6A5849" strokeWidth="2.5" fill="none" />
      <path d="M120 44 l2 -4 M132 42 l2 -4 M144 43 l2 -4 M156 46 l2 -4 M126 56 l2 -4 M140 55 l2 -4" stroke="#9A8574" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M74 56 C62 52 46 56 38 66 L30 82 C28 88 32 92 38 92 L64 90 C72 82 76 70 74 56 Z" fill="#8A7564" />
      <path d="M36 72 C32 62 30 52 34 42 C38 54 42 62 45 70 Z" fill="#D6CCB6" />
      <path d="M50 64 C48 58 48 54 51 50 C53 56 56 60 56 64 Z" fill="#D6CCB6" />
      <path d="M70 50 L76 39 L82 50 Z" fill="#6A5849" />
      <circle cx="58" cy="70" r="2" fill="#121212" />
      <path d="M32 86 L44 86" stroke="#5E4D40" strokeWidth="1.5" />
    </>
  ),
  paus: (
    <>
      <path d="M8 112 q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" stroke="#2F4558" strokeWidth="2" fill="none" />
      <path d="M40 50 C36 40 38 30 34 22 M40 50 C44 40 48 34 50 26" stroke="#A9C0D3" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M14 70 C30 52 70 44 120 46 C160 48 190 56 206 64 L222 52 C226 50 230 52 228 56 L220 70 L230 82 C232 86 228 88 224 86 L206 76 C190 84 160 92 120 92 C70 94 30 88 14 70 Z" fill="#4F6E8C" />
      <path d="M20 74 C40 86 80 90 120 88 C150 86 176 82 196 76 C176 86 150 92 120 92 C80 94 40 88 20 74 Z" fill="#A9C0D3" />
      <path d="M30 79 C60 86 90 88 120 88" stroke="#8BA6BC" strokeWidth="1.2" fill="none" />
      <path d="M70 80 C76 92 90 98 100 96 C92 90 84 84 78 78 Z" fill="#3E5A75" />
      <path d="M170 56 L180 47 L182 58 Z" fill="#3E5A75" />
      <circle cx="96" cy="58" r="3" fill="#6F8CA8" opacity="0.7" /><circle cx="130" cy="56" r="2.5" fill="#6F8CA8" opacity="0.7" /><circle cx="158" cy="60" r="3" fill="#6F8CA8" opacity="0.7" />
      <circle cx="42" cy="68" r="2" fill="#121212" />
    </>
  ),
};

// isi gambar tanpa pembungkus <svg>, untuk kartu story (next/og tidak memakai className).
// next/og belum bisa menggambar <text> di svg, jadi label teks (mis. "BERAS 25 kg") dibuang.
export function ilustrasiArt(item: Item["id"]): React.ReactNode {
  const art = ART[item] as React.ReactElement<{ children: React.ReactNode }>;
  return Children.toArray(art.props.children).filter((child) => !(isValidElement(child) && child.type === "text"));
}

export function Ilustrasi({ item, className = "" }: { item: Item["id"]; className?: string }) {
  return (
    <svg role="img" aria-label={`ilustrasi ${LABEL[item]}`} viewBox="0 0 240 130" className={`block h-auto w-full ${className}`}>
      {ART[item]}
    </svg>
  );
}
