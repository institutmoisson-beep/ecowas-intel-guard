# West Africa Shield

Create a enterprise-grade Cyber-Intelligence, Brand Protection, and Legal Lobbying Platform named "Ignite Shield & Intelligence Suite (ISIS)" tailored for West Africa (CEDEAO / ECOWAS region).



### 1. BRANDING & UI/UX DIRECTION

- **Style:** Military-grade Command Center UI (Dark Theme default, high contrast). Inspired by Palantir Foundry and Maltego.

- **Color Palette:** Tactical Slate `#090D16`, Deep Crimson Threat Alert `#EF4444`, Cyber Emerald Verified `#10B981`, Electric Amber `#F59E0B`, Pure White `#FFFFFF`.

- **Navigation Layout:** Sidebar Navigation featuring Module Badges, Active Threat Ticker, Quick Escalation Drawer, and Global West Africa Region Selector (Côte d'Ivoire, Benin, Burkina Faso, Mali, Guinea, Ghana, Senegal, Togo, Niger, Nigeria).



---



### 2. CORE MODULES & WORKFLOWS



#### Module 1: OSINT Intelligence & Target Cartography (Démaskage & Réseaux)

- **Target Dossier Builder:** Create target profile cards with real names, alias handles, associated TikTok/Facebook/YouTube URLs, phone numbers, Mobile Money records, and suspected physical locations.

- **Interactive Network Graph (Vis.js / React-Flow style):** Visual node graph mapping relationships between target actors, funding sources, shared IPs, cross-platform accounts, and master orchestrators.

- **Digital Footprint Harvester:** Integrates mock APIs for Open-Source Intelligence gathering (DNS lookup, phone carrier resolution, metadata extraction from social posts).



#### Module 2: Social Listening & Predictive Sentiment Engine

- **Live Stream & Keyword Monitor:** Real-time stream monitor tracking keywords (e.g. "Ignite", "Arnaque", "Qnet", "Plainte").

- **Threat Escalation Scoring:** AI-based Sentiment Classifier assigning threat levels (Low, Medium, High, Critical) to incoming videos, lives, and viral posts.

- **Predictive Spike Alert:** Audio & Visual alert triggering when negative engagement velocity exceeds thresholds, recommending immediate counter-narrative deployment.



#### Module 3: Rapid Takedown & Copyright Command Center

- **Automated Notice Generator:** One-click legal DMCA / Defamation Takedown Request generator formatted for Meta Rights Manager, TikTok IP Protection, and YouTube Safety.

- **Evidence Vault & Bailiff Export:** Automatically generate time-stamped Evidence PDFs with screenshots, raw URLs, and legal hashes ready for Bailiff (Huissier) certification.

- **Batch Escalation Status:** Track takedown progress per platform (`Submitted`, `Under Review`, `Account Suspended`, `Content Removed`).



#### Module 4: Transnational Legal & Interpol Warrant Tracking

- **Multi-Jurisdiction Dossier:** Cross-border legal case tracker covering CEDEAO cybercrime frameworks.

- **PLCC / Interpol Extradition Tracker:** Manage formal legal complaints across national cybercrime units (PLCC Côte d'Ivoire, CNIN Benin, CLCT Burkina Faso, etc.).

- **Bailiff & Court Summons Registry:** File tracking for bailiff summons, international arrest warrants (Notice Rouge / Green), and court hearings.



#### Module 5: West Africa Institutional Directory & Lobbying Hub

- **High-Level Official Directory:** Secure, encrypted, role-access contact registry filtered by Country, Region, and Institution:

  * Categories: Ministers, Prosecutors (Procureurs), Police Commissioners, Judges, Village Chiefs, Mayors, Gendarmerie Commanders, and Media Directors.

  * Fields: Official Title, Direct Encrypted Line, Office Location, Influence Level, and Meeting/Intervention History.

- **Influence & Counter-Crisis Lobbying Pipeline:** Track official institutional visits, whitepaper submissions, and compliance certificate deliveries to protect company legitimacy.



---



### 3. DATABASE SCHEMA EXTENSION (SUPABASE SQL)



```sql

-- Target Dossiers (OSINT)

CREATE TABLE public.intelligence_targets (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  alias VARCHAR(100) NOT NULL,

  full_name VARCHAR(150),

  primary_platform VARCHAR(50),

  country VARCHAR(50) DEFAULT 'Côte dIvoire',

  threat_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical

  metadata JSONB, -- social handles, phone numbers, IPs

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

);



-- Institutional Directory (Lobbying & Authorities)

CREATE TABLE public.institutional_directory (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  country VARCHAR(50) NOT NULL,

  category VARCHAR(50) NOT NULL, -- prosecutor, judge, mayor, chief, commander

  full_name VARCHAR(150) NOT NULL,

  official_title VARCHAR(150) NOT NULL,

  phone_encrypted TEXT,

  email_encrypted TEXT,

  region_jurisdiction VARCHAR(100),

  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

);



-- Takedown & Legal Actions

CREATE TABLE public.takedown_actions (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  target_id UUID REFERENCES public.intelligence_targets(id),

  platform VARCHAR(50) NOT NULL,

  content_url TEXT NOT NULL,

  status VARCHAR(30) DEFAULT 'submitted', -- submitted, in_review, taken_down, rejected

  legal_dossier_url TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

);  mets en place la base de données et l'application

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ecowas-intel-guard.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e737f4da-2525-45bc-bc64-4bab87667e54).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
