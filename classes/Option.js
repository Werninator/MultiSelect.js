var Option = (function() {
    "use strict";

    function Option(_element) {
        this.checked       = false;
        this.label         = '';
        this.disabled      = false;
        this.isOptionGroup = false;
        this.options       = [];
        this.domElement    = typeof _element !== 'undefined' ? _element : null;

        this.inheritCharacteristicsFromElement();
    }

    Option.prototype.inheritCharacteristicsFromElement = function() {

        if (!this.domElement)
            return;

        this.isOptionGroup = this.domElement.tagName === 'OPTGROUP';
        this.checked  = this.domElement.checked;
        this.disabled = this.domElement.disabled;

        if (this.isOptionGroup) {
            this.isOptionGroup = true;
            this.options = this.domElement.options;
        } else {
            this.label = this.domElement.text;
        }

    };

    return Option;

})();
