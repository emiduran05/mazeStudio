const block = (type, label, description, icon, keywords = []) => ({ type, label, description, icon, keywords });

export const blockLibraries = {
    content: [
        { id:"writing", label:"Write & explain", description:"Build the narrative of your lesson", icon:"fa-pen-nib", blocks:[
            block("HEADING","Heading","Title a section","fa-heading",["title"]),
            block("TEXT","Paragraph","Explain a concept or add instructions","fa-align-left",["text","paragraph"]),
            block("CALLOUT","Callout","Highlight a tip, warning or key idea","fa-lightbulb",["note","tip"]),
            block("QUOTE","Quote","Feature a quotation or source","fa-quote-left"),
            block("CODE","Code snippet","Show formatted source code","fa-code",["programming"]),
            block("CHECKLIST","Checklist","Share objectives, materials or steps","fa-square-check",["tasks","objectives"]),
        ]},
        { id:"media", label:"Media", description:"Teach with visual and audio resources", icon:"fa-photo-film", blocks:[
            block("CANVAS","Canvas presentation","Build a visual, multi-page presentation","fa-object-group",["slides","presentation","canva"]),
            block("IMAGE","Image","Upload a diagram, photo or illustration","fa-image"),
            block("VIDEO","Video","Upload a video lesson","fa-video"),
            block("AUDIO","Audio","Upload narration, pronunciation or music","fa-volume-high",["language","listening"]),
        ]},
        { id:"interactive", label:"Interactive tools", description:"Let learners explore, draw and work through ideas", icon:"fa-hand-pointer", blocks:[
            block("WHITEBOARD","Whiteboard","Give learners a space to draw and show their work","fa-pen-ruler",["drawing","canvas"]),
            block("EQUATION","Math equation","Write powers, roots and fractions","fa-square-root-variable",["formula","latex"]),
            block("EMBED","Interactive embed","Embed a simulation, map, form or external tool","fa-window-maximize",["iframe","web"]),
        ]},
        { id:"organize", label:"Organize", description:"Give the lesson a clear visual structure", icon:"fa-layer-group", blocks:[
            block("LAYOUT","Columns","Place blocks side by side","fa-table-columns"),
            block("TABLE","Table","Organize comparisons or structured data","fa-table"),
            block("DIVIDER","Divider","Separate lesson sections","fa-minus"),
            block("BUTTON","Action button","Link to a resource or next action","fa-arrow-up-right-from-square",["link"]),
        ]},
        { id:"resources", label:"Downloads", description:"Share material learners can keep", icon:"fa-folder-open", blocks:[
            block("PDF","PDF document","Attach a reading or worksheet","fa-file-pdf"),
            block("FILE","Downloadable file","Attach slides, templates or datasets","fa-paperclip"),
        ]},
    ],
    activities: [
        { id:"general", label:"Knowledge checks", description:"Quick activities for any subject", icon:"fa-circle-check", blocks:[
            block("MULTIPLE_CHOICE","Multiple choice","Choose one or several correct options","fa-list-check",["quiz"]),
            block("TRUE_FALSE","True or false","Check a statement quickly","fa-toggle-on"),
            block("SHORT_ANSWER","Short answer","Write a response checked automatically","fa-keyboard"),
            block("CLASSIFICATION","Classification","Choose a category for every item","fa-tags",["categorize","types"]),
            block("MATCHING","Matching","Connect related concepts","fa-link"),
            block("ORDERING","Ordering","Arrange steps, events or ideas","fa-arrow-down-1-9"),
            block("CHALLENGE","Graded Challenge","Require a complete graded assessment","fa-flag-checkered"),
            block("FLASHCARDS","Flashcards","Create a quick concept review deck","fa-clone",["cards","memory"]),
        ]},
        { id:"languages", label:"Languages", description:"Practice vocabulary, comprehension and production", icon:"fa-language", blocks:[
            block("FILL_BLANKS","Fill in the blanks","Complete a sentence or passage","fa-pen-to-square",["grammar","vocabulary"]),
            block("CLASSIFICATION","Word classification","Classify every word by grammar or type","fa-tags",["noun","verb","adjective","categories"]),
            block("MATCHING","Vocabulary matching","Pair words, meanings or translations","fa-link",["vocabulary"]),
            block("ORDERING","Build a sentence","Put words or events in order","fa-arrow-down-a-z",["grammar"]),
            block("AUDIO","Listening material","Add pronunciation or listening input","fa-headphones",["listening"]),
            block("CHALLENGE","Speaking assessment","Use a Challenge with a recorded response","fa-microphone",["speaking","recording"]),
            block("FLASHCARDS","Vocabulary cards","Practice words, definitions and translations","fa-clone",["vocabulary","memory"]),
        ]},
        { id:"mathematics", label:"Mathematics", description:"Present notation and let learners work through problems", icon:"fa-square-root-variable", blocks:[
            block("EQUATION","Math equation","Write powers, roots and fractions","fa-square-root-variable",["formula","latex"]),
            block("SHORT_ANSWER","Numeric answer","Check a short numeric result","fa-hashtag",["number"]),
            block("MULTIPLE_CHOICE","Math multiple choice","Offer possible results or methods","fa-list-ol"),
            block("WHITEBOARD","Problem workspace","Let the learner draw and show their work","fa-pen-ruler",["drawing"]),
            block("TABLE","Data table","Present values, functions or observations","fa-table-cells"),
        ]},
    ],
};

export const blockCategories = [...blockLibraries.content, ...blockLibraries.activities];

export const layoutPresets = [
    { value:"50_50", label:"50 / 50", columns:[50,50] },
    { value:"33_67", label:"33 / 67", columns:[33,67] },
    { value:"67_33", label:"67 / 33", columns:[67,33] },
    { value:"25_75", label:"25 / 75", columns:[25,75] },
    { value:"75_25", label:"75 / 25", columns:[75,25] },
    { value:"THREE_EQUAL", label:"Three columns", columns:[33.33,33.33,33.33] },
];
