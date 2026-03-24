# Mermaid Timeline Reference

Complete reference for timeline diagrams in Mermaid. Timelines display events in chronological order, grouped by time periods and optional sections.

---

## Directive

```
timeline
```

---

## Complete Example

```mermaid
timeline
    title History of Web Development
    section Early Web
        1991 : Tim Berners-Lee creates the World Wide Web
        1993 : Mosaic browser released
             : HTML 1.0 specification
        1995 : JavaScript created by Brendan Eich
             : PHP 1.0 released
    section Dynamic Web
        1999 : AJAX concept emerges
        2004 : Web 2.0 era begins
             : Gmail launches
             : Facebook founded
        2006 : jQuery released
             : AWS launches EC2
    section Modern Web
        2010 : AngularJS released
             : Node.js gains traction
        2013 : React released by Facebook
        2014 : Vue.js released
        2015 : ES6/ES2015 standardized
             : GraphQL open-sourced
    section Current Era
        2020 : Deno 1.0 released
             : Tailwind CSS mainstream adoption
        2022 : HTTP/3 standardized
             : Edge computing growth
        2023 : AI-assisted development
             : Web Components maturity
```

---

## Basic Syntax

Each timeline entry is a time period followed by a colon and an event description:

```
time period : event description
```

```mermaid
timeline
    2020 : Project kickoff
    2021 : Beta release
    2022 : General availability
    2023 : Major update
```

---

## Multiple Events Per Time Period

Add multiple events to the same time period by putting additional events on subsequent lines with the same indentation, using `: event` syntax:

```mermaid
timeline
    January : Team formed
            : Requirements gathered
            : Budget approved
    February : Development started
             : CI/CD pipeline setup
    March : Alpha release
          : User testing begins
```

The first line defines the time period. Subsequent lines starting with `:` add events to that same time period.

---

## Title

Add a title at the top of the timeline:

```mermaid
timeline
    title Product Roadmap 2024
    Q1 : Foundation work
       : Core API
    Q2 : Beta launch
       : Partner integrations
    Q3 : GA release
    Q4 : Enterprise features
```

---

## Section Grouping

Sections visually group time periods under a common label:

```mermaid
timeline
    title Company Milestones
    section Startup Phase
        2018 : Company founded
             : Seed funding
        2019 : First product launch
             : 10 employees
    section Growth Phase
        2020 : Series A funding
             : 50 employees
        2021 : International expansion
             : 200 employees
    section Scale Phase
        2022 : Series B funding
             : IPO preparation
        2023 : Public listing
             : 1000 employees
```

Sections are optional. Without sections, all time periods appear in a single group.

---

## Time Period Formats

The time period label is free-form text. Use whatever format fits:

```mermaid
timeline
    title Flexible Time Labels
    section Dates
        2024-01-15 : Specific date event
        Jan 2024 : Month-year event
    section Quarters
        Q1 2024 : Quarterly event
        Q2 2024 : Another quarter
    section Relative
        Week 1 : First week event
        Week 2 : Second week event
    section Named
        Phase 1 : Named period
        Phase 2 : Another named period
```

---

## Practical Examples

### Sprint Timeline

```mermaid
timeline
    title Sprint 14 Timeline
    section Planning
        Mon Jan 8 : Sprint planning meeting
                  : Story point estimation
        Tue Jan 9 : Technical design sessions
    section Development
        Wed Jan 10 : Backend API implementation
        Thu Jan 11 : Frontend components
                   : Database migrations
        Fri Jan 12 : Integration work
    section Review
        Mon Jan 15 : Code review
                   : QA testing
        Tue Jan 16 : Bug fixes
        Wed Jan 17 : Sprint demo
                   : Retrospective
```

### Release History

```mermaid
timeline
    title Release History
    section v1.x
        v1.0 : Initial release
             : Core features
        v1.1 : Bug fixes
             : Performance improvements
        v1.2 : New export formats
             : Plugin system
    section v2.x
        v2.0 : Major rewrite
             : New UI
             : Breaking API changes
        v2.1 : Migration tools
             : Backward compatibility layer
        v2.2 : Enterprise features
             : SSO support
```

### Project Phases

```mermaid
timeline
    title Project Lifecycle
    section Discovery
        Week 1-2 : Stakeholder interviews
                 : Market research
                 : Competitive analysis
    section Design
        Week 3-4 : Wireframes
                 : User flows
                 : Design system
        Week 5 : Design review
               : Prototype testing
    section Build
        Week 6-8 : Core implementation
                 : API development
        Week 9-10 : Frontend build
                  : Integration testing
    section Launch
        Week 11 : Staging deployment
                : UAT
        Week 12 : Production release
                : Monitoring setup
                : Documentation
```

---

## Best Practices

1. **Use a `title`** -- always add a title to provide context for what the timeline represents.

2. **Group with sections for long timelines** -- sections break up visual monotony and add organizational structure. Use them when you have more than 5-6 time periods.

3. **Keep event descriptions concise** -- one line per event, 3-8 words. The timeline should be scannable.

4. **Limit events per time period to 3-4** -- too many events per period creates visual clutter.

5. **Use consistent time period formats** -- do not mix "2024", "January", and "Q1" in the same timeline unless sections clearly separate them.

6. **Order chronologically** -- timelines are read left to right. Ensure time periods are in sequential order.

7. **Use sections to tell a story** -- section labels like "Growth Phase", "Discovery", "v2.x" guide the reader through a narrative arc.

8. **Prefer timelines over Gantt for high-level overviews** -- timelines are better for communicating "what happened when" without duration/dependency complexity.

9. **Limit total timeline to 10-15 time periods** -- longer timelines should be split into separate diagrams or use broader time periods.

10. **Use free-form time labels for flexibility** -- "Phase 1", "Sprint 3", "Q2 2024", and "2024-03-15" are all valid. Choose what communicates best for your audience.
