const optionsData = {
	"Taxable Investment": [
		{ text: "Individual", hideBeneficiary: true, bypassProbate: false },
		{ text: "Joint Tenants with Rights of Survivorship", hideBeneficiary: true, bypassProbate: true },
		{ text: "Joint Tenants in Common", hideBeneficiary: true, bypassProbate: false },
		{ text: "Joint Tenants in Entirety", hideBeneficiary: true, bypassProbate: true },
		{ text: "Joint Community Property", hideBeneficiary: true, bypassProbate: false },
		{ text: "Individual – Transfer on Death (TOD)", bypassProbate: true },
		{ text: "Joint Tenants with Rights of Survivorship – Transfer on Death (TOD)", bypassProbate: true },
		{ text: "Joint Tenants in Entirety – Transfer on Death (TOD)", bypassProbate: true },
	],
	Retirement: [{ text: "Traditional IRA" }, { text: "Roth IRA" }, { text: "Rollover IRA" }, { text: "SEP IRA" }, { text: "SIMPLE IRA" }, { text: "IRA BDA" }, { text: "Roth IRA BDA" }, { text: "401(k) Plan" }, { text: "Solo 401(k)/Individual 401(k)" }, { text: "Profit-Sharing Plan" }, { text: "Defined Benefit Plan" }, { text: "403(b) Plan" }, { text: "457 Plan" }, { text: "Thrift Savings Plan (TSP)" }],
	"Accounts for Minors": [{ text: "Uniform Gifts to Minors Act (UGMA)" }, { text: "Uniform Transfers to Minors Act (UTMA)" }, { text: "529" }],
	"Business & Trust Accounts": [{ text: "Trust Under Agreement" }, { text: "Trust Under Will" }, { text: "Corporation" }, { text: "Limited Liability Company (LLC)" }, { text: "Non-Prototype" }],
	Insurance: [{ text: "Life Insurance" }, { text: "Annuity" }],
	"Important Legal Documents": [{ text: "Last Will and Testament" }, { text: "Trust Agreement" }, { text: "Durable Power of Attorney" }, { text: "Healthcare Power of Attorney" }, { text: "Tax Returns" }],
};

// Function to add "Other" option to all account types
function addOtherOption(options) {
	for (let accountType in options) {
		options[accountType].push({ text: "Other" });
	}
	return options;
}

// Apply the "Other" option to all account types
const optionsDataWithOther = addOtherOption(optionsData);

// Modify the getOptions function to use optionsDataWithOther
function getOptions(accountLabel) {
    console.log("Getting options for:", accountLabel);
    const options = optionsDataWithOther[accountLabel];
    console.log("Options found:", options);
    if (options) {
        return { accountLabel, options };
    } else {
        console.log("No options found for:", accountLabel);
        return { accountLabel: "", options: [] };
    }
}

// Modify getBypassProbate to handle "Other" option
function getBypassProbate(accountType, registrationType, hasBeneficiary) {
	if (registrationType === "Other") {
		return hasBeneficiary;
	}

	const option = optionsDataWithOther[accountType]?.find((opt) => opt.text === registrationType);
	if (!option) return false;

	switch (accountType) {
		case "Retirement":
		case "Insurance":
			return hasBeneficiary;
		case "Accounts for Minors":
		case "Business & Trust Accounts":
			return true;
		case "Important Legal Documents":
			return "N/A";
		case "Taxable Investment":
			return option.bypassProbate || false;
		default:
			return false;
	}
}

// Define the base fields structure
const baseFields = {
	fields: [
		{
			name: "registration",
			type: "select",
			placeholder: "Select Registration Type",
			class: "full-width",
		},
		{
			name: "otherRegistration",
			placeholder: "Other Registration Type",
			class: "full-width hidden",
		},
		{
			name: "title",
			placeholder: "Title Placeholder",
			class: "full-width",
		},
		{
			name: "companyName",
			placeholder: "Company Name Placeholder",
			class: "half-width",
		},
		{
			name: "accountNumber",
			placeholder: "Number Placeholder",
			class: "half-width",
			type: "text",
			maskInput: true,
		},
		{
			name: "advisorName",
			placeholder: "Advisor Name",
			class: "half-width",
		},
		{
			name: "advisorPhoneNumber",
			placeholder: "Advisor Phone Number",
			type: "tel",
			pattern: "[0-9]{3}-[0-9]{3}-[0-9]{4}",
			title: "XXX-XXX-XXXX",
			class: "half-width",
		},
		{
			name: "value",
			placeholder: "Value Placeholder",
			class: "full-width",
		},
		{
			name: "beneficiaryLabel",
			type: "label",
			text: "Is there a beneficiary?",
			class: "half-width beneficiaryLabel",
		},
		{
			name: "beneficiaryYN",
			type: "fancyRadio",
			options: ["Yes", "No"],
			class: "half-width",
			optionClasses: ["yes-class", "no-class"],
		},
		{
			name: "beneficiaryName",
			placeholder: "Beneficiary Name",
			class: "half-width hidden",
		},
		{
			name: "beneficiaryPhoneNumber",
			placeholder: "Beneficiary Phone Number",
			type: "tel",
			pattern: "[0-9]{3}-[0-9]{3}-[0-9]{4}",
			title: "XXX-XXX-XXXX",
			class: "half-width hidden",
		},
	],
	uiText: {
		rowLabel: "Document",
	},
};

// Customize for accountFields
const accountFields = JSON.parse(JSON.stringify(baseFields));
accountFields.fields[2].placeholder = "Account Title";
accountFields.fields[3].placeholder = "Firm Name";
accountFields.fields[4].placeholder = "Account Number";
accountFields.fields[7].placeholder = "Account Value";
accountFields.uiText.rowLabel = "Account";

// Customize for insuranceFields
const insuranceFields = JSON.parse(JSON.stringify(baseFields));
insuranceFields.fields[2].placeholder = "Policy Title";
insuranceFields.fields[3].placeholder = "Insurance Company Name";
insuranceFields.fields[4].placeholder = "Policy or Account Number";
insuranceFields.fields[5].placeholder = "Agent Name";
insuranceFields.fields[6].placeholder = "Agent Phone Number";
insuranceFields.fields[7].placeholder = "Policy Value";
insuranceFields.uiText.rowLabel = "Policy";

// Customize for legalDocumentFields
const legalDocumentFields = JSON.parse(JSON.stringify(baseFields));
legalDocumentFields.fields.splice(2, 0, {
  name: "documentName",
  placeholder: "Document Name",
  class: "half-width",
});
legalDocumentFields.fields[3].placeholder = "Document Location";
legalDocumentFields.fields[4].placeholder = "Attorney/CPA Name";
legalDocumentFields.fields[5].placeholder = "Attorney/CPA Phone Number";
legalDocumentFields.fields[5].type = "tel";
legalDocumentFields.fields[5].pattern = "[0-9]{3}-[0-9]{3}-[0-9]{4}";
legalDocumentFields.fields[5].title = "XXX-XXX-XXXX";
legalDocumentFields.fields[6].placeholder = "Executor/Trustee Name";
legalDocumentFields.fields[7].placeholder = "Executor/Trustee Phone Number";
legalDocumentFields.fields[7].type = "tel";
legalDocumentFields.fields[7].pattern = "[0-9]{3}-[0-9]{3}-[0-9]{4}";
legalDocumentFields.fields[7].title = "XXX-XXX-XXXX";
legalDocumentFields.fields[8].class = "hidden"; // Hide the value field
legalDocumentFields.fields[9].class = "hidden"; // Hide beneficiaryLabel
legalDocumentFields.fields[10].class = "hidden"; // Hide beneficiaryYN
legalDocumentFields.fields[11].class = "hidden"; // Hide beneficiaryName
legalDocumentFields.fields[12].class = "hidden"; // Hide beneficiaryPhoneNumber
legalDocumentFields.uiText.rowLabel = "Important Legal Document";
legalDocumentFields.fields.find((f) => f.name === "accountNumber").maskInput = false;

function initializeWidgetSettings() {
	console.log("Initializing widget settings...");

    window.widgetSettingsMapping = {
        account: accountFields,
        insurance: insuranceFields,
        legal_document: legalDocumentFields,
        accounts_for_minors: accountFields,
        taxable_investment: accountFields,
        retirement: accountFields,
        business_trust_accounts: accountFields,
        important_legal_documents: legalDocumentFields
    };
    
    console.log("Widget settings mapping initialized:", Object.keys(window.widgetSettingsMapping));
    console.log("Full widget settings mapping:", window.widgetSettingsMapping);
}

// Call this function when the script loads
initializeWidgetSettings();
console.log("options.js execution completed");
