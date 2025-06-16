import { prisma } from './client.js'

async function testInsert() {
  try {
    console.log('Testing single record insert...')
    
    const testRecord = {
      divNbr: "2140",
      divNmCdNbr: "ALBANY (9B, 2140)",
      brnchCd: "9B",
      warehouseLocn: "2140",
      dateExtract: "2025-05-23",
      timeExtract: "3000411",
      areaId: "F",
      aisle: 83,
      bay: 189,
      levelNumber: 4,
      zone: null,
      productNumber: "9375387",
      licensePlate: "3425237",
      palletId: "3425237",
      palletStatus: "S",
      prodDesc: "BREAD, CUBAN LOAF 18  8 Z",
      purchasePackSize: "24/8 OZ",
      purchaseUom: "CS",
      qtyAvailUnits: 10,
      qtyAvailEaches: 0,
      invyStatus: "A",
      slotStatus: "A",
      rackType: "C",
      slotType: "R",
      floatCode: "F",
      slotCube: 50.0,
      availCubeRemaining: 43.33,
      slotFacing: 40.0,
      slotDepth: 48.0,
      slotHeight: 45.0,
      whseTi: "10",
      mfrProdNbr: "024085",
      buyerId: "464",
      buyrNm: "LINDA THOMAS",
      dateReceived: "2025-03-27",
      expirationDate: "2025-11-28",
      daysRemainingAtTimeOfReceived: 246
    }
    
    const result = await prisma.inventoryLocation.create({
      data: testRecord
    })
    
    console.log('✅ Test insert successful:', result.id)
    
    // Test query
    const query = await prisma.inventoryLocation.findFirst({
      where: { productNumber: "9375387" }
    })
    
    console.log('✅ Test query successful:', query?.prodDesc)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testInsert()