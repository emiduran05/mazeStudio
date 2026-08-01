export const blockCategories = [
    {
        id: "content",
        label: "Content",
        blocks: [
            {
                type: "HEADING",
                label: "Heading",
                description: "Section title",
                icon: "fa-heading",
            },
            {
                type: "TEXT",
                label: "Text",
                description: "Paragraph or explanation",
                icon: "fa-align-left",
            },
            {
                type: "IMAGE",
                label: "Image",
                description: "Upload an image",
                icon: "fa-image",
            },
            {
                type: "VIDEO",
                label: "Video",
                description: "Embed a video",
                icon: "fa-video",
            },
            {
                type: "CODE",
                label: "Code",
                description: "Code example",
                icon: "fa-code",
            },
            {
                type: "QUOTE",
                label: "Quote",
                description: "Highlighted quotation",
                icon: "fa-quote-left",
            },
            {
                type: "CALLOUT",
                label: "Callout",
                description: "Important information",
                icon: "fa-lightbulb",
            },
            {
                type: "DIVIDER",
                label: "Divider",
                description: "Separate sections",
                icon: "fa-minus",
            },
            {
                type: "PDF",
                label: "PDF",
                description: "Attach a PDF",
                icon: "fa-file-pdf",
            },
            {
                type: "FILE",
                label: "File",
                description: "Attach a file",
                icon: "fa-paperclip",
            },
        ],
    },
    {
        id: "structure",
        label: "Structure",
        blocks: [
            {
                type: "LAYOUT",
                label: "Columns",
                description: "Place content side by side",
                icon: "fa-table-columns",
            },
            {
                type: "TABLE",
                label: "Table",
                description: "Create an editable table",
                icon: "fa-table",
            },
        ],
    },
    {
        id: "exercises",
        label: "Exercises",
        blocks: [
            {
                type: "CHALLENGE",
                label: "Challenge",
                description: "Require an independent Challenge",
                icon: "fa-flag-checkered",
            },
            {
                type: "MULTIPLE_CHOICE",
                label: "Multiple choice",
                description: "Question with several options",
                icon: "fa-list-check",
            },
            {
                type: "TRUE_FALSE",
                label: "True or false",
                description: "Binary answer exercise",
                icon: "fa-toggle-on",
            },
            {
                type: "SHORT_ANSWER",
                label: "Short answer",
                description: "Learner writes an answer",
                icon: "fa-keyboard",
            },
            {
                type: "FILL_BLANKS",
                label: "Fill in the blanks",
                description: "Complete missing words",
                icon: "fa-pen-to-square",
            },
            {
                type: "MATCHING",
                label: "Matching",
                description: "Connect related concepts",
                icon: "fa-link",
            },
            {
                type: "ORDERING",
                label: "Ordering",
                description: "Arrange items correctly",
                icon: "fa-arrow-down-1-9",
            },
        ],
    },
];

export const layoutPresets = [
    {
        value: "50_50",
        label: "50 / 50",
        columns: [50, 50],
    },
    {
        value: "33_67",
        label: "33 / 67",
        columns: [33, 67],
    },
    {
        value: "67_33",
        label: "67 / 33",
        columns: [67, 33],
    },
    {
        value: "25_75",
        label: "25 / 75",
        columns: [25, 75],
    },
    {
        value: "75_25",
        label: "75 / 25",
        columns: [75, 25],
    },
    {
        value: "THREE_EQUAL",
        label: "Three columns",
        columns: [33.33, 33.33, 33.33],
    },
];
