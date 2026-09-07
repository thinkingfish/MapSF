# Museum curation review

Museum records are maintained separately in [config/museums.mjs](config/museums.mjs). This document records source checks on 2026-09-06; it does not represent user approval or verification of live ticket availability.

| Venue | Enabled recurring admission | Evidence and limits |
| --- | --- | --- |
| Asian Art Museum | First Sunday each month, 10 AM–5 PM, free general admission | [Official ticketing](https://about.asianart.org/ticketing/) states the first-Sunday program and Sunday hours, encourages timed tickets, and charges separately for special exhibitions. Address: 200 Larkin Street. The [Apple Maps venue record](https://maps.apple.com/place?place-id=IB262B153BB40AD10) provides its actual place point in `place:location` metadata: latitude 37.7802677, longitude −122.416175. This is not an entrance survey. Valid through December 31, 2026. |

Candidates are listed for future research only; none are imported into the generator or assigned guessed free days:

| Candidate | Official starting point | Needed before enabling |
| --- | --- | --- |
| de Young | [Fine Arts Museums of San Francisco](https://www.famsf.org/) | Verify current resident/free-day eligibility, hours, exhibition exclusions, closures, and actual place point. |
| Legion of Honor | [Fine Arts Museums of San Francisco](https://www.famsf.org/) | Verify the same independently for this venue. |
| SFMOMA | [Official visit information](https://www.sfmoma.org/visit/) | Establish a currently published recurring free program and all eligibility/time restrictions; do not assume an old monthly free day still exists. |

To add a museum, use the shared venue schema documented in [PLACES.md](PLACES.md), preserve evidence URLs and a review date, bound the validity window, and add meaningful recurrence/eligibility/closure tests. Source changes require a fresh review before extending expiry.

## Your curation checklist

Check venues you want included; unchecked candidates still require the evidence above before activation.

- [ ] Asian Art Museum — review the verified first-Sunday entry above.
- [ ] de Young — research for inclusion.
- [ ] Legion of Honor — research for inclusion.
- [ ] SFMOMA — research current qualifying programs.
