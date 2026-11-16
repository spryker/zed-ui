<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\ZedUi\Dependency\Facade;

class ZedUiToTranslatorFacadeBridge implements ZedUiToTranslatorFacadeInterface
{
    /**
     * @var \Spryker\Zed\Translator\Business\TranslatorFacadeInterface
     */
    protected $translatorFacade;

    /**
     * @param \Spryker\Zed\Translator\Business\TranslatorFacadeInterface $translatorFacade
     */
    public function __construct($translatorFacade)
    {
        $this->translatorFacade = $translatorFacade;
    }

    /**
     * @param array<string, mixed> $parameters
     */
    public function trans(string $id, array $parameters = [], ?string $domain = null, ?string $locale = null): string
    {
        return $this->translatorFacade->trans($id, $parameters, $domain, $locale);
    }
}
