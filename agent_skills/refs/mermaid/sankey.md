# Mermaid Sankey Diagram Reference

Sankey diagrams visualize flow quantities between nodes. The width of each link is proportional to the flow value, making it easy to see where resources, energy, traffic, or money move through a system.

---

## Directive

```mermaid
sankey-beta
```

The `sankey-beta` directive is required. The "beta" suffix indicates this diagram type is still evolving.

**Important:** A blank line after the `sankey-beta` directive is required before the data begins.

---

## CSV Format

Sankey data uses a simple CSV format with three columns:

```
source,target,value
```

| Column   | Description                           |
| -------- | ------------------------------------- |
| `source` | The originating node name             |
| `target` | The destination node name             |
| `value`  | Numeric flow quantity (width of link) |

Each line defines one flow. Nodes are created automatically from source and target names.

---

## Complete Example

```mermaid
sankey-beta

Revenue,Operating Costs,40
Revenue,R&D,25
Revenue,Marketing,20
Revenue,Profit,15
Operating Costs,Salaries,25
Operating Costs,Infrastructure,10
Operating Costs,Licensing,5
R&D,Frontend Team,10
R&D,Backend Team,10
R&D,ML Team,5
Marketing,Digital Ads,12
Marketing,Events,8
```

---

## Basic Example

```mermaid
sankey-beta

Source A,Target X,50
Source A,Target Y,30
Source B,Target X,20
Source B,Target Z,40
```

---

## Multi-Step Flow Example

Sankey diagrams support multi-step flows where the target of one link becomes the source of another, creating chains:

```mermaid
sankey-beta

Solar,Electricity,100
Wind,Electricity,80
Natural Gas,Electricity,200
Electricity,Residential,150
Electricity,Commercial,120
Electricity,Industrial,80
Electricity,Transmission Loss,30
Residential,Heating,60
Residential,Cooling,40
Residential,Lighting,30
Residential,Appliances,20
Commercial,Office HVAC,50
Commercial,Lighting,40
Commercial,Equipment,30
```

In this example, `Electricity` is both a target (from energy sources) and a source (to consumption sectors), creating a two-stage flow.

---

## Website Traffic Flow Example

```mermaid
sankey-beta

Google,Landing Page,5000
Social Media,Landing Page,2000
Direct,Landing Page,1500
Email,Landing Page,1000
Landing Page,Sign Up,3000
Landing Page,Product Page,4500
Landing Page,Bounce,2000
Product Page,Add to Cart,2000
Product Page,Exit,2500
Add to Cart,Checkout,1500
Add to Cart,Abandon Cart,500
Checkout,Purchase,1200
Checkout,Abandon Checkout,300
```

---

## Data Format Rules

### Node names

- Node names can contain spaces and most characters
- Node names are case-sensitive: `Revenue` and `revenue` are different nodes
- A node referenced as both source and target in different rows creates multi-step flow

### Values

- Must be positive numbers
- Can be integers or decimals
- Values determine the proportional width of each link
- Zero values are valid but produce invisible links

### Blank line requirement

A blank line between `sankey-beta` and the first data row is required:

```
%% CORRECT
sankey-beta

Source,Target,10

%% INCORRECT (will not parse)
sankey-beta
Source,Target,10
```

### Quoting

Node names containing commas must be quoted:

```
"New York, NY",East Coast,500
"San Francisco, CA",West Coast,300
```

---

## Budget Flow Example

```mermaid
sankey-beta

Total Budget,Engineering,500
Total Budget,Sales,300
Total Budget,Operations,200
Engineering,Frontend,200
Engineering,Backend,200
Engineering,DevOps,100
Sales,Enterprise,200
Sales,SMB,100
Operations,IT,100
Operations,Facilities,60
Operations,HR,40
```

---

## Tips and Limitations

- The `sankey-beta` directive must be followed by a blank line before data.
- Node positioning is automatic -- you cannot control the vertical order of nodes.
- Link colors are assigned automatically and cannot be customized through the CSV data.
- All flows are left-to-right. There is no support for right-to-left or vertical Sankey layouts.
- Circular flows (A -> B -> A) are not supported and will produce rendering errors.
- Very small values relative to large ones may produce links too thin to see.
- There is no support for node colors or labels beyond the node name.
- Column headers are not supported -- do not add a `source,target,value` header row.
- The diagram type is still in beta; syntax and rendering behavior may change in future mermaid versions.
