<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\ZedUi\Dependency\Service;

interface ZedUiToUtilEncodingServiceInterface
{
    /**
     * @param array<string, mixed> $value
     */
    public function encodeJson(array $value, ?int $options = null, ?int $depth = null): ?string;
}
