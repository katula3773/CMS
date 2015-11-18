"use strict";

let _ = require('lodash');

module.exports = {

    /**
     * Create pagination
     *
     * @param totalPage - Total page
     * @param currentPage - Current page
     * @param itemLink - Link of page item
     * @param numberPagesOfPagination - Limit number of page display in pagination
     * @param previousButton - Content of previous button
     * @param nextButton - Content of next button
     * @param className - Class of pagination use for CSS
     * @returns HTML
     */
    handler: function (totalPage, currentPage, itemLink, numberPagesOfPagination, previousButton, nextButton, className) {
        // Default total page = 1
        totalPage = parseInt(totalPage);
        totalPage = (_.isNumber(totalPage) && totalPage > 0) ? totalPage : 1;

        // Default current page = 1
        currentPage = parseInt(currentPage);
        currentPage = (_.isNumber(currentPage) && currentPage > 0) ? currentPage : 1;

        // Default number pages of pagination = 5
        numberPagesOfPagination = parseInt(numberPagesOfPagination);
        numberPagesOfPagination = (_.isNumber(numberPagesOfPagination) && numberPagesOfPagination > 1) ? numberPagesOfPagination : 5;

        // Default item link = '?p={page}'
        itemLink = itemLink.match(/\{page\}/) ? itemLink : '?p={page}';

        // Default previous and next button
        previousButton = previousButton || '«';
        nextButton = nextButton || '»';

        // Default pagination class name
        className = className || 'pagination';

        let start, end;

        // Only display pagination when total page > 1
        if (totalPage > 1) {
            if (totalPage > numberPagesOfPagination) {
                if (numberPagesOfPagination >= 3) {
                    if ((currentPage >= numberPagesOfPagination) && (currentPage <= (totalPage - numberPagesOfPagination + 1))) {
                        start = currentPage - Math.floor(numberPagesOfPagination / 2);
                        if (start < 1) {
                            start = 1;
                        }

                        end = start + numberPagesOfPagination - 1;
                        if (end > totalPage) {
                            end = totalPage;
                        }
                    }
                    else if (currentPage < numberPagesOfPagination) {
                        start = 1;
                        end = numberPagesOfPagination;
                    }
                    else if (currentPage > (totalPage - numberPagesOfPagination + 1)) {
                        start = totalPage - numberPagesOfPagination + 1;
                        end = totalPage;
                    }
                }
            }
            else if (totalPage < numberPagesOfPagination) {
                start = 1;
                end = totalPage;
            }
            else {
                start = currentPage;
                if ((currentPage + numberPagesOfPagination) > totalPage) {
                    start = totalPage - numberPagesOfPagination + 1;
                }

                end = currentPage + numberPagesOfPagination - 1;
                if (end > totalPage) {
                    end = totalPage;
                }
            }

            let html = `<ul class="${className}">
                            <li class="previous ${currentPage == 1 ? 'disabled' : ''}">
                                <a href="${currentPage == 1 ? '#' : itemLink.replace('{page}', currentPage - 1)}">
                                    ${previousButton}
                                </a>
                            </li>`;

            if (start > 1) {
                let url = itemLink.replace('{page}', start - 1);
                html += `<li><a href="${url}">...</a></li>`
            }

            for (let i = start; i <= end; i++) {
                let url = itemLink.replace('{page}', i);
                let active = currentPage == i ? "active" : "";
                html += `<li class="${active}"><a href="${url}">${i}</a></li>`
            }

            if (end < totalPage) {
                let url = itemLink.replace('{page}', end + 1);
                html += `<li><a href="${url}">...</a></li>`
            }

            html += `<li class="next ${currentPage == totalPage ? 'disabled' : ''}">
                        <a href="${currentPage == totalPage ? '#' : itemLink.replace('{page}', currentPage + 1)}">
                            ${nextButton}
                        </a>
                    </li>
                </ul>`;

            return html;
        } else {
            return '';
        }
    }
};